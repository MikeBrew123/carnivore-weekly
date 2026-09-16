#!/usr/bin/env python3
"""Tests for the Command Centre 2.0 executive layer.

Run: python3 dashboard/test_command_center.py

These pin the rules the dashboard exists to enforce, and every one of them is
a rule that was violated by the previous version of the page:
  - a percentage on a tiny base must not be printed
  - a failed API must never render as zero
  - a non-sequential funnel must not show a >100% transition
  - collected revenue must not be called profit, and progress toward a
    net-profit target must read "unavailable" while no cost feed exists
  - the de-spiked traffic figure must be named after its method, not called
    "human-like"
  - an experiment threshold must unlock a review, never declare a result
  - the deterministic layer must be fully usable when the model returns nothing
  - a metric being down is not, by itself, "needs attention"
"""
import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import command_center_exec as X  # noqa: E402

TODAY = date(2026, 9, 13)
TODAY_ISO = TODAY.isoformat()


def daily(pairs):
    return [{'date': d, 'sessions': s, 'users': max(1, s // 2)} for d, s in pairs]


class SampleSize(unittest.TestCase):
    def test_tiny_base_suppresses_percentage(self):
        c = X.delta('Purchases', 1, 3, base='purchases')
        self.assertIsNone(c['pct'], '1 → 3 must never print +200%')
        self.assertFalse(c['reliable'])
        self.assertIn('directional', c['note'])
        self.assertEqual(c['abs_fmt'], '+2')

    def test_adequate_base_keeps_percentage(self):
        c = X.delta('Sessions', 200, 260, base='sessions')
        self.assertEqual(c['pct'], 30.0)
        self.assertTrue(c['reliable'])
        self.assertIsNone(c['note'])

    def test_rate_metrics_move_in_points_not_percent_of_percent(self):
        c = X.delta('Open rate', 40.0, 50.0, unit='pct', base='email')
        self.assertIsNone(c['pct'])
        self.assertEqual(c['abs'], 10.0)

    def test_inverted_metric_down_is_good(self):
        self.assertEqual(X.delta('Bounces', 10, 2, invert=True, base='generic')['direction'], 'up')

    def test_zero_previous_never_divides(self):
        self.assertIsNone(X.delta('New thing', 0, 5)['pct'])


class SignalVsNoise(unittest.TestCase):
    def setUp(self):
        rows = [(f'2026-08-{d:02d}', 20) for d in range(17, 32)]
        rows += [(f'2026-09-{d:02d}', 20) for d in range(1, 13)]
        self.t = {'daily': daily(rows), 'daily_median_28d': 20,
                  'spike_days': [{'date': '2026-09-10', 'sessions': 300, 'users': 295}],
                  'today': {'sessions': 4}}
        for r in self.t['daily']:
            if r['date'] == '2026-09-10':
                r['sessions'] = 300

    def test_partial_today_is_excluded_from_windows(self):
        self.t['daily'].append({'date': TODAY_ISO, 'sessions': 3, 'users': 2})
        c = X.clean_traffic(self.t, TODAY_ISO)
        self.assertNotIn(TODAY_ISO, [d for d in c['excluded_days']])
        self.assertEqual(c['observed_7d'], 300 + 6 * 20)
        self.assertEqual(c['today_so_far'], 4)

    def test_observed_and_clean_are_separate_numbers(self):
        c = X.clean_traffic(self.t, TODAY_ISO)
        self.assertEqual(c['clean_7d'], 120)
        self.assertEqual(c['observed_7d'], 420)  # 300 spike + 6 × 20
        self.assertTrue(c['contaminated'])
        self.assertEqual(c['excluded_days'], ['2026-09-10'])

    def test_cleaned_figure_is_named_after_its_method(self):
        c = X.clean_traffic(self.t, TODAY_ISO)
        self.assertEqual(X.CLEANED_LABEL, 'Cleaned trend sessions')
        self.assertNotIn('human', X.CLEANED_LABEL.lower())
        self.assertNotIn('human', c['delta']['label'].lower())
        self.assertIn('whole days', c['method'])
        self.assertIn('not a count of humans', c['method'])

    def test_observed_is_kept_alongside_the_cleaned_figure(self):
        c = X.clean_traffic(self.t, TODAY_ISO)
        self.assertIn('observed_7d', c)
        self.assertIn('observed_prev_7d', c)
        self.assertNotEqual(c['observed_7d'], c['clean_7d'])

    def test_no_executive_output_calls_sessions_human_like(self):
        d = {'traffic': {'cw': self.t}, 'email_engagement': {}}
        ch = X.build_changes(d, TODAY)
        ex = X.build_executive(d, ch, {}, {'unavailable': True}, [], TODAY_ISO)
        blob = ' '.join(ex['brief'] + ex['what_this_means']
                        + [c['label'] for c in ch['wow'] + ch['dod']]).lower()
        self.assertNotIn('human-like', blob)
        self.assertNotIn('human like', blob)

    def test_unavailable_traffic_returns_none_not_zero(self):
        self.assertIsNone(X.clean_traffic({'error': 'GA4 timeout'}, TODAY_ISO))


class Funnel(unittest.TestCase):
    def events(self, **counts):
        return {'window_days': 28, 'by_event': {
            k: {'sessions': v[0], 'events': v[1],
                'daily': [{'date': '2026-09-08', 'sessions': v[0], 'events': v[1]}]}
            for k, v in counts.items()}}

    def test_each_stage_declares_how_it_is_known(self):
        f = X.build_funnel(self.events(
            calculator_step1_viewed=(280, 335), calculator_free_results=(123, 144),
            calculator_offer_impression=(100, 146), calculator_bridge_cta_click=(7, 31),
            calculator_payment_modal_opened=(10, 35), begin_checkout=(3, 3),
            purchase=(3, 5)))
        by = {s['name']: s for s in f['stages']}
        self.assertEqual(by['Paid offer eligible']['status'], 'inferred')
        self.assertEqual(by['Paid offer seen']['status'], 'measured')
        self.assertIn('not by measurement', by['Paid offer eligible']['note'])

    def test_missing_event_is_unavailable_not_zero(self):
        f = X.build_funnel(self.events(calculator_step1_viewed=(280, 335)))
        by = {s['name']: s for s in f['stages']}
        self.assertEqual(by['Purchase']['status'], 'unavailable')
        self.assertIsNone(by['Purchase']['sessions'])

    def test_sessions_not_event_counts_drive_the_funnel(self):
        f = X.build_funnel(self.events(
            calculator_step1_viewed=(280, 335), calculator_free_results=(123, 144),
            calculator_offer_impression=(100, 146),
            calculator_payment_modal_opened=(10, 35)))
        modal = {s['name']: s for s in f['stages']}['Payment modal opened']
        self.assertEqual(modal['sessions'], 10, '10 sessions, not 35 event fires')
        self.assertEqual(modal['repeat_ratio'], 3.5)
        self.assertEqual(modal['from_prev_pct'], 10.0)

    def test_cta_paths_are_contributors_not_a_sequential_stage(self):
        # The modal is reachable from several controls, so a CTA count below the
        # modal count is normal and must not be drawn as a stage above it.
        f = X.build_funnel(self.events(
            calculator_step1_viewed=(280, 335), calculator_free_results=(123, 144),
            calculator_offer_impression=(100, 146), calculator_bridge_cta_click=(7, 31),
            calculator_payment_modal_opened=(10, 35)))
        self.assertNotIn('Bridge CTA clicked', [s['name'] for s in f['stages']])
        br = {b['name']: b for b in f['branches']}
        self.assertEqual(br['Bridge CTA clicked']['sessions'], 7)
        self.assertEqual(br['Upgrade button clicked']['status'], 'unavailable')
        self.assertFalse(any(s['impossible'] for s in f['stages']))
        self.assertIn('not added', f['branch_note'])

    def test_a_stage_exceeding_its_parent_is_flagged_impossible(self):
        f = X.build_funnel(self.events(
            calculator_step1_viewed=(100, 100), calculator_free_results=(120, 120)))
        self.assertTrue({s['name']: s for s in f['stages']}['Free result reached']['impossible'])

    def test_biggest_leak_identified(self):
        f = X.build_funnel(self.events(
            calculator_step1_viewed=(280, 280), calculator_free_results=(123, 123),
            calculator_offer_impression=(100, 100), calculator_bridge_cta_click=(7, 7),
            calculator_payment_modal_opened=(6, 6), begin_checkout=(3, 3), purchase=(3, 3)))
        self.assertEqual(f['biggest_leak']['from'], 'Calculator started')
        self.assertEqual(f['biggest_leak']['lost'], 157)

    def test_no_event_data_is_an_error_not_an_empty_funnel(self):
        self.assertIn('error', X.build_funnel({'error': 'GA4 down'}))


class Revenue(unittest.TestCase):
    rev = {'configured': True,
           'yesterday': {'gross': 29.0, 'net': 29.0, 'refunds': 0.0, 'charges': 1},
           'last_7d': {'gross': 87.0, 'net': 87.0, 'refunds': 0.0, 'charges': 3},
           'last_30d': {'gross': 101.5, 'net': 101.5, 'refunds': 0.0, 'charges': 4},
           'mtd': {'gross': 201.0, 'net': 87.0, 'refunds': 114.0, 'charges': 3},
           'by_product_30d': {'CW calculator report': 101.5}}

    def test_gross_refunds_and_collected_are_three_separate_lines(self):
        r = X.build_revenue(self.rev, 1000.0, TODAY)
        self.assertEqual(r['mtd_gross'], 201.0)
        self.assertEqual(r['mtd_refunds'], 114.0)
        self.assertEqual(r['mtd_collected'], 87.0)

    def test_collected_revenue_is_never_called_net_profit(self):
        r = X.build_revenue(self.rev, 1000.0, TODAY)
        self.assertNotIn('mtd_net_measured', r)
        self.assertIn('collected', r['collected_label'].lower())
        self.assertNotIn('profit', r['collected_label'].lower())
        self.assertIn('not deducted', r['collected_basis'].lower().replace('are not', 'not'))

    def test_net_profit_is_unavailable_not_estimated_from_refunds(self):
        r = X.build_revenue(self.rev, 1000.0, TODAY)
        self.assertFalse(r['net_profit_known'])
        self.assertIsNone(r['net_profit_mtd'])
        self.assertIsNone(r['target_pct'], 'no percentage of a profit target may be printed')
        self.assertEqual(r['target_status'], 'unavailable')
        self.assertIn('NET PROFIT', r['target_note'])

    def test_any_pace_is_labelled_collected_not_profit(self):
        r = X.build_revenue(self.rev, 1000.0, TODAY)
        self.assertIn('not a profit pace', r['pace_label'])

    def test_the_brief_says_profit_progress_is_unavailable(self):
        r = X.build_revenue(self.rev, 1000.0, TODAY)
        ex = X.build_executive({'email_engagement': {}}, {'dod': [], 'wow': []}, {}, r, [],
                               TODAY_ISO)
        line = next(b for b in ex['brief'] if 'Revenue month-to-date' in b)
        self.assertIn('unavailable', line)
        self.assertIn('NET PROFIT', line)
        self.assertNotIn('% of it', line)

    def test_aov_on_four_sales_is_marked_thin(self):
        self.assertFalse(X.build_revenue(self.rev, 1000.0, TODAY)['aov_reliable'])

    def test_stripe_failure_is_unavailable_not_zero(self):
        r = X.build_revenue({'configured': True, 'error': 'timeout'}, 1000.0, TODAY)
        self.assertTrue(r['unavailable'])
        self.assertNotIn('mtd_gross', r)


class DataQuality(unittest.TestCase):
    def test_failed_source_is_reported_as_failed(self):
        dq = X.build_data_quality({'traffic': {'cw': {'error': 'GA4 403'}, 'kd': {}},
                                   'revenue': {'configured': True}}, '2026-09-13 09:00')
        by = {s['key']: s for s in dq['sources']}
        self.assertEqual(by['ga4_cw']['state'], 'failed')
        self.assertIn('403', by['ga4_cw']['detail'])
        self.assertEqual(dq['failed'], 1)

    def test_missing_credentials_are_not_a_failure(self):
        dq = X.build_data_quality({'revenue': {'configured': False}}, 'now')
        self.assertEqual({s['key']: s for s in dq['sources']}['stripe']['state'], 'not-configured')

    def test_gsc_lag_is_declared(self):
        dq = X.build_data_quality({'search': {'cw': {}}}, 'now')
        self.assertIn('lags', {s['key']: s for s in dq['sources']}['gsc_cw']['lag_note'])


class Attention(unittest.TestCase):
    base = {'automation': {'workflows': []}, 'queues': {}, 'email_engagement': {},
            'funnels': {}, 'paid_funnel': {}, 'data_quality': {'sources': []}}

    def test_a_metric_being_down_is_not_an_attention_item(self):
        d = dict(self.base)
        ch = {'wow': [X.delta('CW sessions', 400, 200, base='sessions')], 'dod': []}
        self.assertEqual(X.build_needs_attention(d, ch, TODAY), [])

    def test_failed_workflow_is_red(self):
        d = dict(self.base, automation={'workflows': [
            {'label': 'Daily publish', 'state': 'failure', 'ran': '2026-09-12'}]})
        items = X.build_needs_attention(d, {'wow': [], 'dod': []}, TODAY)
        self.assertEqual(items[0]['severity'], 'red')

    def test_empty_queue_is_red_and_runway_is_amber(self):
        d = dict(self.base, queues={'cw': {'ready': 0}, 'kd': {'ready': 2, 'runway_days': 2}})
        sevs = {i['severity'] for i in X.build_needs_attention(d, {'wow': [], 'dod': []}, TODAY)}
        self.assertEqual(sevs, {'red', 'amber'})

    def test_email_thresholds_need_an_adequate_cohort(self):
        thin = dict(self.base, email_engagement={'cw': {'attempts': 20, 'bounce_rate_pct': 40.0}})
        self.assertEqual(X.build_needs_attention(thin, {'wow': [], 'dod': []}, TODAY), [])
        real = dict(self.base, email_engagement={
            'cw': {'attempts': 459, 'bounce_rate_pct': 6.0, 'delivery_rate_pct': 94.0,
                   'complaint_rate_pct': 0.0}})
        self.assertEqual(len(X.build_needs_attention(real, {'wow': [], 'dod': []}, TODAY)), 2)

    def test_complaint_rate_above_a_tenth_of_a_percent_is_red(self):
        d = dict(self.base, email_engagement={
            'cw': {'attempts': 459, 'complaint_rate_pct': 0.4, 'bounce_rate_pct': 0.2,
                   'delivery_rate_pct': 99.0}})
        self.assertEqual(X.build_needs_attention(d, {'wow': [], 'dod': []}, TODAY)[0]['severity'],
                         'red')


class DontOverreact(unittest.TestCase):
    def test_low_sample_movements_are_listed(self):
        ch = {'dod': [X.delta('Purchases', 1, 3, base='purchases')], 'wow': []}
        out = X.build_dont_overreact({}, ch, {}, TODAY_ISO)
        self.assertTrue(any('Too few' in o for o in out))

    def test_crawler_exclusion_is_explained(self):
        t = {'daily': daily([(f'2026-08-{d:02d}', 20) for d in range(17, 32)]
                            + [(f'2026-09-{d:02d}', 20) for d in range(1, 13)]),
             'daily_median_28d': 20,
             'spike_days': [{'date': '2026-09-10', 'sessions': 300, 'users': 295}]}
        for r in t['daily']:
            if r['date'] == '2026-09-10':
                r['sessions'] = 300
        out = X.build_dont_overreact({'traffic': {'cw': t}}, {'dod': [], 'wow': []}, {}, TODAY_ISO)
        self.assertTrue(any('crawler-spike' in o for o in out))

    def test_capped_at_three(self):
        ch = {'dod': [X.delta(f'M{i}', 1, 3, base='purchases') for i in range(9)], 'wow': []}
        self.assertLessEqual(len(X.build_dont_overreact({}, ch, {}, TODAY_ISO)), 3)


class Executive(unittest.TestCase):
    def test_quiet_day_with_nothing_broken_is_green(self):
        ex = X.build_executive({'email_engagement': {}}, {'dod': [], 'wow': []}, {},
                               {'unavailable': True}, [], TODAY_ISO)
        self.assertEqual(ex['status'], 'green')
        self.assertEqual(ex['suggested_action'], ['Nothing needs intervention today.'])

    def test_a_red_attention_item_makes_the_page_red(self):
        ex = X.build_executive({'email_engagement': {}}, {'dod': [], 'wow': []}, {},
                               {'unavailable': True},
                               [{'severity': 'red', 'text': 'Workflow failed', 'why': None},
                                {'severity': 'amber', 'text': 'Queue low', 'why': None}],
                               TODAY_ISO)
        self.assertEqual(ex['status'], 'red')
        self.assertEqual(ex['status_label'], 'Action needed')

    def test_stripe_outage_is_not_reported_as_no_sales(self):
        ex = X.build_executive({'email_engagement': {}}, {'dod': [], 'wow': []}, {},
                               {'unavailable': True, 'reason': 'timeout'}, [], TODAY_ISO)
        self.assertTrue(any('not the same as no sales' in b for b in ex['brief']))

    def test_brief_is_between_three_and_six_sentences(self):
        d = {'traffic': {'cw': {'daily': daily([(f'2026-08-{x:02d}', 30) for x in range(17, 32)]
                                               + [(f'2026-09-{x:02d}', 30) for x in range(1, 13)]),
                               'daily_median_28d': 30, 'spike_days': [], 'today': {'sessions': 5}},
                         'kd': {'daily': daily([(f'2026-09-{x:02d}', 3) for x in range(1, 13)]),
                                'daily_median_28d': 3, 'spike_days': [], 'today': {'sessions': 0}}},
             'email_engagement': {'cw': {'attempts': 459, 'delivery_rate_pct': 99.6,
                                         'bounce_rate_pct': 0.4, 'complaint_rate_pct': 0.0,
                                         'unique_open_rate_pct': 61.4}}}
        ch = {'dod': [], 'wow': [X.delta('CW calculator starts (7d)', 30, 50, base='calculator')]}
        rev = X.build_revenue(Revenue.rev, 1000.0, TODAY)
        ex = X.build_executive(d, ch, {}, rev, [], TODAY_ISO)
        self.assertGreaterEqual(len(ex['brief']), 3)
        self.assertLessEqual(len(ex['brief']), 6)
        self.assertTrue(any('$1,000/month NET' in b for b in ex['brief']))

    def test_low_sample_change_never_becomes_an_action(self):
        ch = {'dod': [], 'wow': [X.delta('Purchases (7d)', 1, 3, base='purchases')]}
        ex = X.build_executive({'email_engagement': {}}, ch, {}, {'unavailable': True}, [],
                               TODAY_ISO)
        self.assertEqual(ex['what_id_watch'], [])


class Experiments(unittest.TestCase):
    """Window semantics and the attribution boundary.

    Both pinned because both were wrong on 2026-09-13: the start date was the
    day the bridge shipped rather than the first clean day after it, and the
    checkout/purchase counts were being read as outcomes of the experiment when
    they are only same-window site totals.
    """

    spec = [{'name': 'CW bridge offer revision',
             'shipped': '2026-09-13T14:45:00Z',
             'started': '2026-09-14',
             'start_rationale': 'shipped mid-day 09-13, so that day is excluded',
             'denominator_event': 'calculator_offer_impression',
             'denominator_label': 'Paid offer seen',
             'numerator_event': 'calculator_bridge_cta_click',
             'numerator_label': 'Bridge CTA engaged',
             'checkout_event': 'begin_checkout',
             'checkout_label': 'Checkout sessions in same measurement window',
             'outcome_event': 'purchase',
             'outcome_label': 'Purchase sessions in same measurement window',
             'min_sample': 100}]

    def events(self, series):
        """series: {event: [(date, sessions), ...]}"""
        return {'by_event': {
            ev: {'sessions': sum(n for _, n in rows), 'events': sum(n for _, n in rows),
                 'daily': [{'date': dt, 'sessions': n, 'events': n} for dt, n in rows]}
            for ev, rows in series.items()}}

    def full(self, den, num, chk=0, buys=0, day='2026-09-15'):
        return self.events({'calculator_offer_impression': [(day, den)],
                            'calculator_bridge_cta_click': [(day, num)],
                            'begin_checkout': [(day, chk)],
                            'purchase': [(day, buys)]})

    # ── window semantics ──
    def test_a_future_start_is_reported_as_not_started_not_as_zeros(self):
        e = X.build_experiments(self.spec, self.full(37, 5, 1, 2, day='2026-09-12'), TODAY)[0]
        self.assertTrue(e['not_started'])
        self.assertIn('NOT STARTED', e['status'])
        self.assertIn('2026-09-14', e['status'])
        self.assertEqual((e['denominator'], e['numerator'], e['checkouts'], e['outcome']),
                         (0, 0, 0, 0))
        self.assertEqual(e['days'], 0)

    def test_the_ship_day_is_never_counted(self):
        """The bridge shipped 14:45 UTC on 09-13, so GA4's 09-13 bucket mixes
        pre- and post-change traffic and cannot be split by a daily rollup."""
        later = date(2026, 9, 16)
        ev = self.events({
            'calculator_offer_impression': [('2026-09-13', 500), ('2026-09-14', 40),
                                            ('2026-09-15', 30)],
            'calculator_bridge_cta_click': [('2026-09-13', 90), ('2026-09-14', 4)],
            'begin_checkout': [('2026-09-13', 9), ('2026-09-14', 1)],
            'purchase': [('2026-09-13', 2), ('2026-09-14', 1)]})
        e = X.build_experiments(self.spec, ev, later)[0]
        self.assertEqual(e['denominator'], 70, '09-13 impressions must be excluded')
        self.assertEqual(e['numerator'], 4)
        self.assertEqual(e['checkouts'], 1)
        self.assertEqual(e['outcome'], 1, "the ship day's sales are not experiment outcomes")

    def test_measured_days_are_counted_inclusively_from_the_start(self):
        e = X.build_experiments(self.spec, self.full(10, 1), date(2026, 9, 16))[0]
        self.assertEqual(e['days'], 3)   # 14th, 15th, 16th

    def test_the_ship_date_is_kept_for_audit_but_is_not_the_start(self):
        e = X.build_experiments(self.spec, self.full(10, 1), date(2026, 9, 16))[0]
        self.assertEqual(e['shipped'], '2026-09-13T14:45:00Z')
        self.assertEqual(e['started'], '2026-09-14')
        self.assertNotEqual(e['started'], e['shipped'][:10])
        self.assertIn('excluded', e['start_rationale'])

    # ── same window is not attribution ──
    def test_checkout_and_purchase_carry_same_window_labels(self):
        e = X.build_experiments(self.spec, self.full(140, 21, 3, 2), date(2026, 9, 20))[0]
        self.assertIn('same measurement window', e['checkout_label'])
        self.assertIn('same measurement window', e['outcome_label'])
        self.assertIn('not outcomes attributed', e['attribution'])
        self.assertIn('Nothing here proves those sessions saw the bridge offer',
                      e['attribution'])

    def test_the_verdict_never_claims_purchases_came_from_the_impressions(self):
        e = X.build_experiments(self.spec, self.full(140, 21, 3, 2), date(2026, 9, 20))[0]
        v = e['verdict'].lower()
        self.assertNotIn('purchases from', v)
        self.assertNotIn('checkouts from', v)
        self.assertNotIn('purchases and', v)
        # It may only relate the two events that actually define the experiment.
        self.assertIn('engaged the bridge cta', v)
        self.assertIn('sessions that saw the offer', v)

    def test_what_matters_does_not_put_purchases_beside_the_impressions(self):
        exps = X.build_experiments(self.spec, self.full(40, 6, 1, 2), date(2026, 9, 20))
        items = X.build_what_matters({'email_engagement': {}}, {'dod': [], 'wow': []}, {},
                                     {'unavailable': True}, [], exps, TODAY_ISO)
        fact = next(i['fact'] for i in items if 'bridge' in i['fact'].lower())
        self.assertIn('engaged the CTA', fact)
        self.assertNotIn('purchase', fact.lower())
        self.assertNotIn('checkout', fact.lower())

    # ── threshold semantics, unchanged ──
    def test_below_threshold_locks_the_experiment(self):
        e = X.build_experiments(self.spec, self.full(37, 5), date(2026, 9, 20))[0]
        self.assertIn('KEEP MEASURING', e['status'])
        self.assertIn('BELOW REVIEW THRESHOLD', e['status'])
        self.assertIn('Do not change', e['verdict'])

    def test_reaching_the_threshold_unlocks_a_review_not_a_verdict(self):
        e = X.build_experiments(self.spec, self.full(140, 21, 0, 0), date(2026, 9, 20))[0]
        self.assertEqual(e['status'], 'REVIEW ELIGIBLE')
        for banned in ('winner', 'working', 'success', 'keep', 'change', 'proven', 'significant'):
            self.assertNotIn(banned, e['status'].lower(),
                             f'status must not contain the verdict word "{banned}"')
        prose = (e['verdict'] + ' ' + e['threshold_meaning']).lower()
        self.assertIn('not that it worked', prose)
        self.assertIn('not a result', prose)
        self.assertIn('not proof', prose)
        self.assertIn('not a winner', prose)
        self.assertIn('not a decision', prose)

    def test_zero_purchases_are_still_shown(self):
        e = X.build_experiments(self.spec, self.full(140, 21, 0, 0), date(2026, 9, 20))[0]
        self.assertEqual(e['outcome'], 0)
        self.assertEqual(e['checkouts'], 0)
        self.assertEqual(e['rate_pct'], 15.0)

    def test_panel_separates_the_unattributed_counts_from_the_experiment_events(self):
        import generate_command_center as G
        exps = X.build_experiments(self.spec, self.full(140, 21, 3, 2), date(2026, 9, 20))
        html = G.experiments_html({'experiments': exps})
        head, _, tail = html.partition('exp-unattr')
        self.assertIn('Paid offer seen', head)
        self.assertIn('Bridge CTA engaged', head)
        self.assertNotIn('same measurement window', head,
                         'unattributed counts must sit below the divider')
        self.assertIn('Checkout sessions in same measurement window', tail)
        self.assertIn('Purchase sessions in same measurement window', tail)
        self.assertIn('Same window, not attributed', html)

    def test_a_not_started_panel_shows_no_progress_bar(self):
        import generate_command_center as G
        exps = X.build_experiments(self.spec, self.full(9, 9, 9, 9, day='2026-09-12'), TODAY)
        html = G.experiments_html({'experiments': exps})
        self.assertNotIn('thr-bar', html)
        self.assertIn('NOT STARTED', html)


class Timeline(unittest.TestCase):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    def test_project_log_headings_are_parsed(self):
        tl = X.parse_timeline(self.root, days=45, today=TODAY, include_git=False)
        self.assertTrue(tl, 'expected dated headings in docs/project-log')
        self.assertTrue(all(len(e['date']) == 10 for e in tl))
        self.assertTrue(all(e['date'] <= TODAY_ISO for e in tl))

    def test_correlation_carries_the_caveat_and_never_claims_cause(self):
        tl = [{'date': '2026-09-10', 'kind': 'decision', 'title': 'Bridge card revised'}]
        ch = {'wow': [X.delta('CW calculator starts (7d)', 30, 50, base='calculator')]}
        out = X.correlate(tl, ch, TODAY)
        self.assertIn('not proven causation', out[0]['caveat'])
        self.assertEqual(out[0]['days_before'], 3)
        self.assertEqual(out[0]['movements'][0]['metric'], 'CW calculator starts (7d)')

    def test_a_change_made_today_cannot_explain_a_weekly_movement(self):
        tl = [{'date': TODAY_ISO, 'kind': 'decision', 'title': 'Shipped this morning'}]
        ch = {'wow': [X.delta('CW calculator starts (7d)', 30, 50, base='calculator')]}
        self.assertEqual(X.correlate(tl, ch, TODAY), [])

    def test_one_change_is_reported_once_not_pasted_against_every_mover(self):
        tl = [{'date': '2026-09-10', 'kind': 'decision', 'title': 'Bridge card revised'},
              {'date': '2026-09-09', 'kind': 'commit', 'title': 'deploy site'}]
        ch = {'wow': [X.delta('CW calculator starts (7d)', 30, 50, base='calculator'),
                      X.delta('CW organic clicks (7d)', 214, 297, base='clicks')]}
        out = X.correlate(tl, ch, TODAY)
        self.assertEqual(len(out), 1)
        self.assertEqual(len(out[0]['movements']), 2)
        self.assertEqual(out[0]['other_candidates'], 1)

    def test_unreliable_movement_is_never_given_a_cause(self):
        tl = [{'date': '2026-09-10', 'kind': 'decision', 'title': 'Bridge card revised'}]
        ch = {'wow': [X.delta('Purchases (7d)', 1, 3, base='purchases')]}
        self.assertEqual(X.correlate(tl, ch, TODAY), [])


class Evidence(unittest.TestCase):
    def test_tiers_track_the_sample_floor(self):
        self.assertEqual(X.evidence(5, 'sessions'), 'thin')
        self.assertEqual(X.evidence(50, 'sessions'), 'usable')
        self.assertEqual(X.evidence(400, 'sessions'), 'solid')
        self.assertEqual(X.evidence(None, 'sessions'), 'thin')

    def test_every_delta_carries_an_evidence_tier(self):
        c = X.delta('Purchases', 1, 3, base='purchases')
        self.assertIn(c['evidence'], X.EVIDENCE_TIERS)
        self.assertEqual(c['evidence'], 'thin')
        self.assertEqual(c['floor'], X.MIN_SAMPLE['purchases'])


class WhatMatters(unittest.TestCase):
    empty = {'email_engagement': {}}

    def base_changes(self):
        return {'dod': [], 'wow': []}

    def test_a_quiet_day_says_so_rather_than_inventing_work(self):
        items = X.build_what_matters(self.empty, self.base_changes(), {},
                                     {'unavailable': False, 'yesterday': {'net': 0, 'charges': 0},
                                      'last_30d': {'net': 0}, 'purchases_30d': 0},
                                     [], [], TODAY_ISO)
        self.assertTrue(all('No action' in i['action'] for i in items))

    def test_every_item_is_a_fact_interpretation_action_triple(self):
        items = X.build_what_matters(
            self.empty, self.base_changes(), {},
            X.build_revenue(Revenue.rev, 1000.0, TODAY),
            [{'severity': 'red', 'text': 'Queue empty', 'why': None}], [], TODAY_ISO)
        for i in items:
            self.assertTrue(i['fact'] and i['interpretation'] and i['action'])
            self.assertIn(i['state'], ('action', 'watch', 'good'))

    def test_amber_attention_is_not_mirrored_here(self):
        items = X.build_what_matters(
            self.empty, self.base_changes(), {}, {'unavailable': True},
            [{'severity': 'amber', 'text': 'Pinterest queue empty', 'why': None}], [], TODAY_ISO)
        self.assertNotIn('Pinterest queue empty', [i['fact'] for i in items])

    def test_red_attention_leads(self):
        items = X.build_what_matters(
            self.empty, self.base_changes(), {}, {'unavailable': True},
            [{'severity': 'red', 'text': 'Workflow failed', 'why': None}], [], TODAY_ISO)
        self.assertEqual(items[0]['state'], 'action')
        self.assertEqual(items[0]['fact'], 'Workflow failed')

    def test_low_sample_movement_never_becomes_an_item(self):
        ch = {'dod': [], 'wow': [X.delta('Purchases (7d)', 1, 3, base='purchases')]}
        items = X.build_what_matters(self.empty, ch, {}, {'unavailable': True}, [], [], TODAY_ISO)
        self.assertNotIn('Purchases (7d)', ' '.join(i['fact'] for i in items))

    def test_capped_at_five(self):
        att = [{'severity': 'red', 'text': f'Thing {i}', 'why': None} for i in range(9)]
        self.assertLessEqual(
            len(X.build_what_matters(self.empty, self.base_changes(), {}, {'unavailable': True},
                                     att, [], TODAY_ISO)), 5)

    def test_a_locked_experiment_produces_a_do_not_touch_action(self):
        exps = X.build_experiments(Experiments.spec, Experiments().full(29, 6, 1, 2),
                                   date(2026, 9, 20))
        items = X.build_what_matters(self.empty, self.base_changes(), {}, {'unavailable': True},
                                     [], exps, TODAY_ISO)
        item = next(i for i in items if 'bridge' in i['fact'])
        self.assertIn('do not change', item['action'].lower())
        self.assertIn('6 of 29', item['fact'])

    def test_an_unopened_experiment_says_so_and_still_forbids_changes(self):
        exps = X.build_experiments(Experiments.spec, Experiments().full(9, 9, day='2026-09-12'),
                                   TODAY)
        items = X.build_what_matters(self.empty, self.base_changes(), {}, {'unavailable': True},
                                     [], exps, TODAY_ISO)
        item = next(i for i in items if 'bridge' in i['fact'].lower())
        self.assertIn('has not started', item['fact'])
        self.assertIn('2026-09-14', item['fact'])
        self.assertIn('do not change', item['action'].lower())


class Renders(unittest.TestCase):
    """The generator must import and render without network access."""

    def test_generator_imports_and_renders_a_degraded_page(self):
        import generate_command_center as G
        d = {'meta': {'generated_at': '2026-09-13 09:00', 'generated_date': '2026-09-13',
                      'version': 2},
             'traffic': {'cw': {'error': 'GA4 down'}, 'kd': {'error': 'GA4 down'}},
             'search': {'cw': {'error': 'x'}, 'kd': {'error': 'x'},
                        'bing_cw': {'configured': False}, 'bing_kd': {'configured': False}},
             'funnels': {'error': 'supabase down'}, 'demographics': {'error': 'x'},
             'feedback': {'error': 'x'}, 'mail': {'error': 'x'},
             'email_engagement': {}, 'revenue': {'configured': True, 'error': 'timeout'},
             'etsy': {'absent': True}, 'queues': {}, 'automation': {'workflows': []},
             'yesterday': {'date': '2026-09-12'}, 'decisions': {'decisions': []},
             'offer_events': {'error': 'GA4 down'},
             'insights': [], 'analysis': {'narrative': None, 'generated_by': 'rules',
                                          'focus': 'Week in review'}}
        d['data_quality'] = X.build_data_quality(d, d['meta']['generated_at'])
        d['timeline'] = []
        d['paid_funnel'] = X.build_funnel(d['offer_events'])
        d['revenue_exec'] = X.build_revenue(d['revenue'], 1000.0, TODAY)
        d['changes'] = X.build_changes(d, TODAY)
        d['signal'] = {s: X.clean_traffic(d['traffic'][s], TODAY_ISO) for s in ('cw', 'kd')}
        d['experiments'] = []
        d['needs_attention'] = X.build_needs_attention(d, d['changes'], TODAY)
        d['dont_overreact'] = X.build_dont_overreact(d, d['changes'], d['paid_funnel'], TODAY_ISO)
        d['correlations'] = []
        d['executive'] = X.build_executive(d, d['changes'], d['paid_funnel'], d['revenue_exec'],
                                           d['needs_attention'], TODAY_ISO)
        d['what_matters'] = X.build_what_matters(d, d['changes'], d['paid_funnel'],
                                                 d['revenue_exec'], d['needs_attention'], [],
                                                 TODAY_ISO)
        html = G.render_html(d)
        self.assertIn('What matters today', html)
        # A failed source must read as unavailable everywhere it appears, and
        # must never be rendered as a zero.
        self.assertIn('Unavailable — timeout', html)
        self.assertIn('This is not zero revenue', html)
        self.assertIn('Traffic unavailable — not zero traffic', html)
        self.assertIn('not zero', html)
        self.assertNotIn('$0.00', html, 'a Stripe failure must not render as zero revenue')

    def _full_data(self):
        """A healthy collect() result, built without any network call."""
        rows = [(f'2026-08-{x:02d}', 30) for x in range(17, 32)]
        rows += [(f'2026-09-{x:02d}', 30) for x in range(1, 13)]
        def week(sess):
            return {m: {'current': v, 'previous': v * 0.9, 'change_pct': 11.1}
                    for m, v in (('sessions', sess), ('totalUsers', sess * 0.8),
                                 ('newUsers', sess * 0.7), ('screenPageViews', sess * 1.6),
                                 ('engagedSessions', sess * 0.6), ('bounceRate', 45.0))}

        d = {'meta': {'generated_at': '2026-09-13 09:00', 'generated_date': TODAY_ISO,
                      'version': 2},
             'traffic': {'cw': {'daily': daily(rows), 'daily_median_28d': 30, 'spike_days': [],
                                'today': {'sessions': 5, 'users': 4, 'pageviews': 9},
                                'active_now': 1, 'week': week(210), 'sources_7d': [],
                                'top_pages_7d': [], 'devices_7d': [], 'geo_90d': []},
                         'kd': {'daily': daily([(f'2026-09-{x:02d}', 3) for x in range(1, 13)]),
                                'daily_median_28d': 3, 'spike_days': [],
                                'today': {'sessions': 0, 'users': 0, 'pageviews': 0},
                                'active_now': 0, 'week': week(21), 'sources_7d': [],
                                'top_pages_7d': [], 'devices_7d': [], 'geo_90d': []}},
             'search': {'cw': {'current': {'clicks': 297, 'impressions': 9000, 'ctr': 3.3,
                                           'position': 12.0},
                               'previous': {'clicks': 214, 'impressions': 8000, 'ctr': 2.7,
                                            'position': 13.0},
                               'window': '2026-09-05 → 2026-09-11',
                               'top_queries': [], 'top_pages': []},
                        'kd': {'current': {'clicks': 5, 'impressions': 300, 'ctr': 1.7,
                                           'position': 30.0},
                               'previous': {'clicks': 4, 'impressions': 280, 'ctr': 1.4,
                                            'position': 31.0},
                               'window': '2026-09-05 → 2026-09-11',
                               'top_queries': [], 'top_pages': []},
                        'bing_cw': {'configured': True, 'clicks_7d': 83, 'clicks_prev_7d': 86,
                                    'impressions_7d': 2356, 'impressions_prev_7d': 2745,
                                    'top_queries': []},
                        'bing_kd': {'configured': False}},
             'funnels': {'calculator_cw': {'window': 'last 30 days', 'sequential': False,
                                           'denominator': 148, 'note': 'parallel states',
                                           'stages': [{'name': 'Sessions started', 'count': 148},
                                                      {'name': 'Email captured', 'count': 148}],
                                           'week': {'current': 52, 'previous': 30,
                                                    'change_pct': 73.3}},
                         'newsletter_cw': {'active': 300, 'new_7d': 35, 'new_prev_7d': 20,
                                           'unsub_7d': 0}},
             'demographics': {'cw': {}, 'kd': {}}, 'feedback': {'new_7d': 0, 'unreviewed': 0},
             'mail': {'signal_7d': {'replies': 6, 'categories': {'support': 2}, 'basis': 'x'},
                      'inbound_7d': 6, 'human': [], 'internal': [], 'reports': [], 'inbound': []},
             'email_engagement': {'cw': {'attempts': 459, 'delivered': 457, 'bounced': 2,
                                         'complained': 0, 'delivery_rate_pct': 99.56,
                                         'bounce_rate_pct': 0.44, 'complaint_rate_pct': 0.0,
                                         'unique_open_rate_pct': 51.4,
                                         'unique_click_rate_pct': 8.4,
                                         'previous_7d': {'unique_open_rate_pct': 47.8,
                                                         'unique_click_rate_pct': 5.0}},
                                  'fixture_filter_active': True},
             'revenue': dict(Revenue.rev, days_left_in_month=17),
             'etsy': {'absent': True}, 'queues': {'cw': {'ready': 10, 'runway_days': 9}},
             'automation': {'workflows': []}, 'yesterday': {'date': '2026-09-12'},
             'decisions': {'decisions': []},
             'offer_events': {'window_days': 28, 'by_event': {
                 'calculator_step1_viewed': {'sessions': 278, 'events': 335, 'daily': []},
                 'calculator_free_results': {'sessions': 121, 'events': 144, 'daily': []},
                 'calculator_offer_impression': {'sessions': 98, 'events': 146, 'daily': []},
                 'calculator_payment_modal_opened': {'sessions': 9, 'events': 34, 'daily': []},
                 'begin_checkout': {'sessions': 3, 'events': 3, 'daily': []},
                 'purchase': {'sessions': 3, 'events': 5, 'daily': []}}},
             'insights': [], 'analysis': {'narrative': None, 'generated_by': 'rules',
                                          'focus': 'x'}}
        d['data_quality'] = X.build_data_quality(d, d['meta']['generated_at'])
        d['timeline'] = []
        d['paid_funnel'] = X.build_funnel(d['offer_events'])
        d['revenue_exec'] = X.build_revenue(d['revenue'], 1000.0, TODAY)
        d['changes'] = X.build_changes(d, TODAY)
        d['signal'] = {s: X.clean_traffic(d['traffic'][s], TODAY_ISO) for s in ('cw', 'kd')}
        d['experiments'] = []
        d['needs_attention'] = X.build_needs_attention(d, d['changes'], TODAY)
        d['dont_overreact'] = X.build_dont_overreact(d, d['changes'], d['paid_funnel'], TODAY_ISO)
        d['correlations'] = []
        d['executive'] = X.build_executive(d, d['changes'], d['paid_funnel'], d['revenue_exec'],
                                           d['needs_attention'], TODAY_ISO)
        d['what_matters'] = X.build_what_matters(d, d['changes'], d['paid_funnel'],
                                                 d['revenue_exec'], d['needs_attention'],
                                                 d['experiments'], TODAY_ISO)
        return d

    def test_executive_layer_is_complete_when_the_model_returns_nothing(self):
        """--no-model, or any failed/empty model call, must lose nothing but
        the opinion paragraph."""
        import generate_command_center as G
        d = self._full_data()
        d['analysis'] = {'narrative': None, 'generated_by': 'rules', 'focus': 'Week in review'}
        html = G.render_html(d)
        ex = d['executive']
        self.assertGreaterEqual(len(ex['brief']), 3)
        self.assertTrue(ex['status_label'])
        self.assertTrue(ex['suggested_action'])
        for marker in ('What matters today', 'Carnivore Weekly', 'KetoDial',
                       'Paid funnel', 'Currently measuring', 'Signal vs noise',
                       'Data health', 'Cleaned trend sessions', 'Revenue',
                       'Needs attention', 'Change timeline'):
            self.assertIn(marker, html, f'{marker} must survive a null model narrative')
        self.assertIn('No AI review', html)

    def test_page_never_prints_a_percentage_of_the_net_profit_target(self):
        import generate_command_center as G
        html = G.render_html(dict(self._full_data(),
                                  analysis={'narrative': None, 'generated_by': 'rules',
                                            'focus': 'x'}))
        self.assertIn('NET PROFIT', html)
        self.assertIn('not measured', html)
        self.assertIn('unavailable', html)
        self.assertNotIn('% of the NET target', html)
        self.assertNotIn('human-like', html)

    def test_no_always_100_percent_indicator_is_drawn(self):
        """The brief's example of a useless element: a bar that is 100% by
        definition and can never move."""
        import generate_command_center as G
        html = G.render_html(self._full_data())
        self.assertNotIn('100% carried', html,
                         'a definitional 100% carry-through must not be drawn')
        self.assertIn('equal by definition', html)

    def test_print_stylesheet_excludes_the_forensic_drawer(self):
        import generate_command_center as G
        html = G.render_html(self._full_data())
        block = html[html.index('@media print'):]
        block = block[:block.index('</style>')]
        self.assertIn('.forensic{display:none!important}', block.replace(' ', ''))
        for kept in ('.statebar', '.matter', '.score', '.exp-item'):
            self.assertIn(kept, block)

    def test_customer_addresses_never_reach_the_cockpit(self):
        import generate_command_center as G
        d = self._full_data()
        d['mail']['human'] = [{'id': 'x', 'from': 'reader@example.com', 'to': 'a@b.c',
                               'subject': 'a question', 'date': '2026-09-12'}]
        d['mail']['inbound'] = d['mail']['human']
        html = G.render_html(d)
        cockpit = html[:html.index('<details class="forensic"')]
        self.assertNotIn('reader@example.com', cockpit)
        self.assertIn('Replies from readers', cockpit)


class VoiceTests(unittest.TestCase):
    TODAY = date(2026, 9, 16)   # a Wednesday

    def _q(self):
        qs = [{'id': 'q1', 'site': 'cw', 'day': 2, 'question_key': 'symptoms',
               'question_text': 'Feeling any of these?', 'active': True}]
        opts = [{'id': 'o1', 'question_id': 'q1', 'option_text': 'Tired'},
                {'id': 'o2', 'question_id': 'q1', 'option_text': 'Hungry'}]
        return qs, opts

    def test_one_reader_ticking_several_boxes_is_one_respondent(self):
        qs, opts = self._q()
        rows = [{'id': str(i), 'site': 'cw', 'day': 2, 'question_id': 'q1', 'option_id': o,
                 'fingerprint': 'fp1', 'submitted_at': '2026-09-15T10:00:00'}
                for i, o in enumerate(['o1', 'o2', 'o1'])]
        v = X.build_voice([], rows, [], qs, opts, self.TODAY)['cw']
        self.assertEqual(v['respondents_30d'], 1)
        self.assertEqual(v['questions'][0]['respondents_30d'], 1)
        self.assertEqual(v['weekly'][-1]['poll_respondents'], 1)
        self.assertTrue(v['questions'][0]['thin'])

    def test_current_week_is_flagged_partial_and_monday_based(self):
        v = X.build_voice([], [], [], [], [], self.TODAY)['cw']
        self.assertEqual(len(v['weekly']), X.VOICE_WEEKS)
        self.assertEqual(v['weekly'][-1]['week_start'], '2026-09-14')
        self.assertTrue(v['weekly'][-1]['partial'])
        self.assertFalse(any(w['partial'] for w in v['weekly'][:-1]))

    def test_mix_shift_withheld_on_thin_base_and_given_when_both_periods_clear(self):
        def calc(n, goal, day):
            return [{'site': 'cw', 'created_at': day, 'step_completed': 3, 'goal': goal}
                    for _ in range(n)]
        thin = calc(5, 'lose', '2026-09-10') + calc(5, 'maintain', '2026-08-10')
        m = X.build_voice(thin, [], [], [], [], self.TODAY)['cw']['mix']['Goal']
        self.assertFalse(m['reliable'])
        self.assertTrue(all(x['pts'] is None for x in m['values']))
        solid = (calc(30, 'lose', '2026-09-10') + calc(10, 'maintain', '2026-09-10')
                 + calc(20, 'lose', '2026-08-10') + calc(20, 'maintain', '2026-08-10'))
        m = X.build_voice(solid, [], [], [], [], self.TODAY)['cw']['mix']['Goal']
        self.assertTrue(m['reliable'])
        lose = next(x for x in m['values'] if x['value'] == 'lose')
        self.assertEqual(lose['pts'], 25.0)

    def test_incomplete_calculators_do_not_count_as_completions_or_answers(self):
        rows = [{'site': 'kd', 'created_at': '2026-09-15', 'step_completed': 1, 'goal': 'lose'}]
        v = X.build_voice(rows, [], [], [], [], self.TODAY)['kd']
        self.assertEqual(v['weekly'][-1]['calc_starts'], 1)
        self.assertEqual(v['weekly'][-1]['calc_completed'], 0)
        self.assertEqual(v['mix']['Goal']['n_cur'], 0)

    def test_goal_weight_that_contradicts_the_goal_is_counted(self):
        base = {'site': 'cw', 'created_at': '2026-09-16', 'step_completed': 3}
        rows = [dict(base, goal='gain', weight_value=257, weight_unit='lbs', goal_weight_lb=200),
                dict(base, goal='gain', weight_value=120, weight_unit='lbs', goal_weight_lb=130),
                dict(base, goal='lose', weight_value=90, weight_unit='kg', goal_weight_lb=190),
                dict(base, goal='lose', weight_value=150, weight_unit='lbs', goal_weight_lb=170),
                dict(base, goal='gain', weight_value=150, weight_unit='lbs', goal_weight_lb=120,
                     created_at='2026-09-10'),
                dict(base, goal='lose', weight_value=200, weight_unit='lbs', goal_weight_lb=201),
                dict(base, goal='lose', weight_value=200, weight_unit='lbs', goal_weight_lb=None),
                dict(base, goal='maintain', weight_value=150, weight_unit='lbs', goal_weight_lb=None)]
        g = X.build_voice(rows, [], [], [], [], self.TODAY)['cw']['goal_weight']
        self.assertEqual(g['asked_30d'], 6)        # the 09-10 row predates recording
        self.assertEqual(g['given_30d'], 5)
        self.assertEqual(g['gain_below_current'], 1)
        self.assertEqual(g['lose_above_current'], 1)   # 90 kg = 198 lb, so 190 is not above
        self.assertEqual(g['mismatched_30d'], 2)

    def test_render_says_unavailable_not_zero_when_fetch_failed(self):
        import generate_command_center as G
        html = G.voice_html({'voice': {'error': 'boom'}})
        self.assertIn('unavailable', html)
        qs, opts = self._q()
        ok = {'voice': X.build_voice([], [], [], qs, opts, self.TODAY)}
        html = G.voice_html(ok)
        self.assertIn('Carnivore Weekly', html)
        self.assertIn('KetoDial', html)


if __name__ == '__main__':
    unittest.main(verbosity=2)
