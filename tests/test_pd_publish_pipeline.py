"""PescoDial unattended publish path.

(a) scripts/daily_publish.py --site pd, run against a temp copy of
    blog_posts.json (BLOG_POSTS_JSON, TODAY and the generator are patched;
    the real data file is never touched):
      - a ready pd post dated today flips to published and renders
      - a future-dated pd post stays ready
      - the 2-per-7-day cap holds the 3rd post
      - CW and KD posts are untouched
(b) scripts/pd_publish_check.py: newly-published diff, published URLs and
    the stuck-ready drift check.
(c) Workflow wiring: daily-publish.yml has the PD publish step, includes it
    in the commit condition, dispatches pescodial-deploy.yml with
    actions: write; pescodial-deploy.yml has workflow_dispatch, the per-guide
    liveness check and an issue on failure.

Run: python3 tests/test_pd_publish_pipeline.py
"""

import copy
import hashlib
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))
sys.path.insert(0, str(ROOT / "scripts"))

import daily_publish  # noqa: E402
import generate_pd_site as pd  # noqa: E402
import pd_publish_check  # noqa: E402

TODAY = "2026-11-10"
REAL_DATA = ROOT / "data" / "blog_posts.json"


def post(slug, site, status="ready", publish_date=TODAY, date=None):
    return {"slug": slug, "title": slug, "content": "<p>x</p>", "author": "sarah",
            "excerpt": "e", "site": site, "status": status,
            "publish_date": publish_date, "date": date or publish_date}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_publish(tmp_path, posts, site="pd"):
    """Run daily_publish.main() for `site` against a temp blog_posts.json.

    The generator is replaced by a PD render into a temp dir, so the test
    also proves a flipped post renders, without writing pescodial/public.
    Returns (posts after, rendered output dir).
    """
    data = tmp_path / "blog_posts.json"
    data.write_text(json.dumps({"blog_posts": posts}))
    out = tmp_path / "out"
    saved = (daily_publish.BLOG_POSTS_JSON, daily_publish.TODAY,
             daily_publish.run_generator, daily_publish.run_validator, sys.argv)

    def fake_generator():
        rendered, _ = pd.render_site(data, out)
        problems = pd.check_output(out, rendered)
        assert not problems, problems

    try:
        daily_publish.BLOG_POSTS_JSON = data
        daily_publish.TODAY = TODAY
        daily_publish.run_generator = fake_generator
        daily_publish.run_validator = lambda: None
        sys.argv = ["daily_publish.py", "--site", site]
        try:
            daily_publish.main()
        except SystemExit as e:
            assert e.code in (0, None), f"daily_publish exited {e.code}"
    finally:
        (daily_publish.BLOG_POSTS_JSON, daily_publish.TODAY,
         daily_publish.run_generator, daily_publish.run_validator, sys.argv) = saved
    return json.loads(data.read_text())["blog_posts"], out


def by_slug(posts):
    return {p["slug"]: p for p in posts}


def others():
    return [post("cw-today", "cw"), post("cw-past", "cw", publish_date="2026-11-01"),
            post("kd-today", "kd"), post("kd-live", "kd", status="published", publish_date="2026-11-09")]


# ── (a) daily_publish --site pd ──────────────────────────────────────────

def test_today_publishes_future_waits_cw_kd_untouched(tmp_path):
    real_before = sha(REAL_DATA)
    posts = others() + [post("pd-today", "pd"), post("pd-future", "pd", publish_date="2026-11-20")]
    before = copy.deepcopy(posts)
    after, out = run_publish(tmp_path, posts)
    a = by_slug(after)
    assert a["pd-today"]["status"] == "published" and a["pd-today"]["published"] is True
    assert a["pd-future"]["status"] == "ready", "future-dated PD post must not publish"
    for p in before:
        if p["site"] != "pd":
            assert a[p["slug"]] == p, f"{p['slug']} ({p['site']}) was modified by a PD publish"
    assert (out / "guides" / "pd-today" / "index.html").is_file(), "published PD post did not render"
    assert not (out / "guides" / "pd-future").exists(), "future PD post rendered"
    assert "https://www.pescodial.com/guides/pd-today/" in (out / "sitemap.xml").read_text()
    assert sha(REAL_DATA) == real_before, "the real data/blog_posts.json was modified"


def test_cap_holds_the_third(tmp_path):
    posts = others() + [post("pd-a", "pd", publish_date="2026-11-08"),
                        post("pd-b", "pd", publish_date="2026-11-09"),
                        post("pd-c", "pd", publish_date=TODAY)]
    after, _ = run_publish(tmp_path, posts)
    a = by_slug(after)
    assert a["pd-a"]["status"] == "published" and a["pd-b"]["status"] == "published"
    assert a["pd-c"]["status"] == "ready", "cap of 2 per 7 days did not hold the 3rd post"
    for p in others():
        assert a[p["slug"]] == p


def test_cap_counts_already_published_in_window(tmp_path):
    posts = others() + [post("pd-live", "pd", status="published", publish_date="2026-11-05"),
                        post("pd-live2", "pd", status="published", publish_date="2026-11-07"),
                        post("pd-next", "pd")]
    after, _ = run_publish(tmp_path, posts)
    assert by_slug(after)["pd-next"]["status"] == "ready", "2 already live this week, 3rd must wait"


def test_cap_window_rolls_after_seven_days(tmp_path):
    posts = [post("pd-old", "pd", status="published", publish_date="2026-11-03"),
             post("pd-old2", "pd", status="published", publish_date="2026-11-03"),
             post("pd-next", "pd")]
    after, _ = run_publish(tmp_path, posts)
    assert by_slug(after)["pd-next"]["status"] == "published", "posts 7+ days old must not count"


def test_cw_publish_leaves_pd_alone(tmp_path):
    posts = [post("cw-today", "cw"), post("pd-today", "pd")]
    saved = daily_publish.run_validator
    after, _ = run_publish(tmp_path, posts, site="cw")
    a = by_slug(after)
    assert a["cw-today"]["status"] == "published"
    assert a["pd-today"]["status"] == "ready", "a CW publish flipped a PD post"
    assert daily_publish.run_validator is saved


# ── (b) pd_publish_check.py ──────────────────────────────────────────────

def test_newly_published_diff():
    before = [post("x", "pd"), post("y", "pd", status="published"), post("cw", "cw")]
    after = copy.deepcopy(before)
    after[0]["status"] = "published"
    after[2]["status"] = "published"
    assert pd_publish_check.newly_published(before, after) == ["x"]
    assert pd_publish_check.guide_url("x") == "https://www.pescodial.com/guides/x/"


def test_published_slugs_pd_only():
    posts = [post("a", "pd", status="published"), post("b", "pd"), post("c", "kd", status="published")]
    assert pd_publish_check.published_slugs(posts) == ["a"]


def test_stuck_ready_drift():
    posts = [post("old", "pd", publish_date="2026-11-01"),     # 9 days late: stuck
             post("edge", "pd", publish_date="2026-11-02"),    # 8 days: not yet
             post("fresh", "pd", publish_date="2026-11-09"),
             post("cw-old", "cw", publish_date="2026-10-01"),  # other site: ignored
             post("done", "pd", status="published", publish_date="2026-10-01")]
    assert pd_publish_check.stuck(posts, days=8, today=TODAY) == [("old", "2026-11-01")]


# ── (c) workflow wiring ──────────────────────────────────────────────────

def load_wf(name):
    return yaml.safe_load((ROOT / ".github" / "workflows" / name).read_text())


def steps(wf, job):
    return {s.get("name"): s for s in wf["jobs"][job]["steps"]}


def test_daily_publish_has_pd_step_and_deploy_trigger():
    wf = load_wf("daily-publish.yml")
    assert wf["permissions"].get("actions") == "write", "gh workflow run needs actions: write"
    pub = wf["jobs"]["publish"]["steps"]
    names = [s.get("name") for s in pub]
    assert "Publish PD scheduled posts" in names
    assert names.index("Publish PD scheduled posts") > names.index("Publish KD scheduled posts")
    s = steps(wf, "publish")
    assert "daily_publish.py --site pd" in s["Publish PD scheduled posts"]["run"]
    assert "newly-published" in s["Publish PD scheduled posts"]["run"]
    commit = s["Commit and push if changes"]
    assert "steps.publish_pd.outputs.has_changes" in commit["if"], "PD-only days would never commit"
    assert "git push || true" not in commit["run"], "push failure must not be swallowed"
    trig = s["Trigger PescoDial deploy"]
    assert "gh workflow run pescodial-deploy.yml --ref main" in trig["run"]
    assert "steps.commit.outputs.pushed == 'true'" in trig["if"]
    assert trig.get("continue-on-error") is True, "a dispatch failure must not skip the CW deploy"
    hc = steps(wf, "health-check")
    assert "stuck" in hc["PD drift check (stuck ready posts)"]["run"]
    assert hc["PD drift check (stuck ready posts)"].get("continue-on-error") is True
    assert '"pd"' in hc["Check queue health"]["run"]


def test_pescodial_deploy_dispatchable_with_liveness():
    wf = load_wf("pescodial-deploy.yml")
    on = wf.get("on", wf.get(True))  # PyYAML reads the bare key `on` as True
    assert "workflow_dispatch" in on
    assert "data/blog_posts.json" in on["push"]["paths"]
    assert wf["permissions"].get("issues") == "write"
    s = steps(wf, "deploy")
    live = s["Guide liveness (every published PD post)"]["run"]
    assert "published-urls" in live and "sitemap.xml" in live and "exit 1" in live
    issue = s["Open issue on PD deploy or liveness failure"]
    assert issue["if"] == "failure()" and "gh issue create" in issue["run"]


if __name__ == "__main__":
    import inspect
    import tempfile
    failed = passed = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                if "tmp_path" in inspect.signature(fn).parameters:
                    with tempfile.TemporaryDirectory() as d:
                        fn(Path(d))
                else:
                    fn()
                passed += 1
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"FAIL {name}: {type(e).__name__}: {e}")
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
