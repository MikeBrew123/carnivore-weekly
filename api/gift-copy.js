// Gift copy (Sarah, 2026-10-11). Source of truth for card, email and pages.
// Edit here; data/gift-copy.json is the writer's original draft.
export default {
  "cw": {
    "landing": {
      "eyebrow": "Give a carnivore plan",
      "headline": "Don't let them start carnivore blind",
      "subhead": "If someone you love is starting carnivore, or talking about it, give them a plan built on their own answers. Their numbers, their goals, and their medicines checked. Not a printout from a forum.",
      "what_they_get": [
        "A 30-day carnivore plan built on their age, size, activity and goals",
        "Their own daily numbers for protein, fat and calories",
        "A meal plan with real foods and real amounts",
        "An electrolyte plan for the first weeks, when most people feel rough",
        "If they take any medicines, the plan flags what to ask their doctor or pharmacist about"
      ],
      "how_it_works": [
        "You buy the gift and add a short note. We email you a gift card with a unique code.",
        "You forward the email to them, or print the card and hand it over.",
        "They enter the code, answer a few minutes of questions about themselves, and get their own plan."
      ],
      "form_labels": {
        "your_name": "Your name",
        "your_email": "Your email (we send the gift card here)",
        "their_first_name": "Their first name",
        "note": "A note from you (optional)",
        "note_placeholder": "I know you've been reading about this. I wanted you to have a real plan, built for you.",
        "note_help": "This goes on the gift card. A line or two in your own words is plenty."
      },
      "button": "Buy the gift, $29",
      "price_line": "$29, one time. The same personalized report they'd buy for themselves.",
      "fine_print": "The code works once and never expires. They answer the questions themselves, so the plan is built on their information, not yours. The report is educational and does not replace advice from their doctor.",
      "faq": [
        {
          "q": "What if they take medicines?",
          "a": "The questions ask about medicines and health conditions. If they take any medicines, the plan flags what to ask their doctor or pharmacist about before they start, in plain words. With some conditions, like kidney disease, parts of the plan are held back and they're pointed to their doctor instead. That's on purpose."
        },
        {
          "q": "Does the code expire?",
          "a": "No. The code never expires. They can use it this week or in three months, whenever they're ready to start."
        },
        {
          "q": "Can I just send it to them?",
          "a": "Yes. Forward the gift card email to them, or print the card and give it to them in person. Everything they need is on the card."
        },
        {
          "q": "Can I answer the questions for them?",
          "a": "It works best when they answer for themselves. The plan is only as good as the answers, and they know their own weight, medicines and goals better than anyone."
        }
      ]
    },
    "buyer_email": {
      "subject": "Your carnivore plan gift for {recipient_name} is ready",
      "preheader": "Forward this email or print the card. The code never expires.",
      "intro": "Your gift is ready. Forward this email to {recipient_name}, or print the card below and hand it over. When they're ready, they enter the code, answer the questions about themselves, and their plan is built on their answers.",
      "after_card": "If anything goes wrong, or the code doesn't work, just reply to this email and we'll sort it out."
    },
    "card": {
      "title": "{recipient_name}, a plan built for you",
      "title_no_name": "A carnivore plan built for you",
      "line_from": "From {buyer_name}",
      "body": "This is a personalized 30-day carnivore plan, with your own daily numbers, a meal plan and an electrolyte plan for the first weeks. It's built on your answers, including any medicines you take, so it fits you and not someone on the internet. The questions take a few minutes.",
      "cta_label": "Start my plan",
      "redeem_instructions": "Go to {url} and enter your code: {code}. It never expires, so start whenever you're ready."
    },
    "redeem_page": {
      "headline": "Someone wanted you to have a real plan",
      "subhead": "Enter the code from your gift card. Then you'll answer questions about yourself, and your plan is built on those answers.",
      "code_label": "Gift code",
      "email_label": "Your email (we send your plan here)",
      "button": "Start my plan",
      "error_invalid": "That code doesn't match anything we have. Check it against the card, letters and numbers both, and try again.",
      "error_used": "This code has already been used. If you think that's a mistake, reply to the gift card email and we'll look into it.",
      "success": "Your code is good. Next come the questions about you."
    },
    "success_page": {
      "headline": "Your gift is on its way",
      "body": "We've emailed the gift card to you. Forward it to them, or print the card and hand it over. The code never expires, so there's no rush."
    }
  },
  "kd": {
    "landing": {
      "eyebrow": "Give a keto plan",
      "headline": "Help them start keto with a plan, not a guess",
      "subhead": "If someone you love is starting keto, give them the tools to do it properly. A report to take to their doctor, a week of meals, and a starter kit, all built on their own answers.",
      "what_they_get": [
        "A Doctor's Report to bring to their next appointment",
        "A 7-day keto meal plan built on their numbers and goals",
        "The Keto Starter Kit: what to buy, what to clear out, what to expect in week one",
        "If they take any medicines, the report flags what to ask their doctor or pharmacist about"
      ],
      "how_it_works": [
        "You buy the gift and add a short note. We email you a gift card with a unique code.",
        "You forward the email to them, or print the card.",
        "They enter the code, answer a few minutes of questions about themselves, and get their own bundle."
      ],
      "form_labels": {
        "your_name": "Your name",
        "your_email": "Your email (we send the gift card here)",
        "their_first_name": "Their first name",
        "note": "A note from you (optional)",
        "note_placeholder": "You said you wanted to try keto. Here's everything you need to start, built for you.",
        "note_help": "This goes on the gift card. Keep it short and in your own words."
      },
      "button": "Buy the gift, $10.99",
      "price_line": "$10.99, one time. The full Protocol Bundle, personalized to them.",
      "fine_print": "The code works once and never expires. They answer the questions themselves, so the bundle is built on their information. It's educational and meant to be shared with their doctor, not to replace one.",
      "faq": [
        {
          "q": "What if they take medicines?",
          "a": "The questions cover medicines and health conditions. If they take any, the Doctor's Report flags what to ask their doctor or pharmacist about, so the conversation starts with the right questions."
        },
        {
          "q": "Does the code expire?",
          "a": "No. It never expires. They can use it whenever they're ready to start."
        },
        {
          "q": "Can I just send it to them?",
          "a": "Yes. Forward the gift card email, or print the card and hand it to them. The code and instructions are on the card."
        },
        {
          "q": "What is the Doctor's Report for?",
          "a": "It's a short summary of their plan and their answers, written so their doctor can see what they're doing and check it against their health history."
        }
      ]
    },
    "buyer_email": {
      "subject": "Your keto gift for {recipient_name} is ready",
      "preheader": "Forward this email or print the card. The code never expires.",
      "intro": "Your gift is ready. Forward this email to {recipient_name}, or print the card below. They enter the code, answer the questions about themselves, and get their own Protocol Bundle.",
      "after_card": "If anything doesn't work, reply to this email and we'll fix it."
    },
    "card": {
      "title": "{recipient_name}, a keto plan built for you",
      "title_no_name": "A keto plan built for you",
      "line_from": "From {buyer_name}",
      "body": "This is your keto Protocol Bundle: a Doctor's Report to take to your appointment, a 7-day meal plan and a starter kit. It's built on your answers, including any medicines you take. The questions take a few minutes.",
      "cta_label": "Get my plan",
      "redeem_instructions": "Go to {url} and enter your code: {code}. It never expires."
    },
    "redeem_page": {
      "headline": "Your keto plan starts with a few questions",
      "subhead": "Enter the code from your gift card. Then answer the questions about yourself, and your bundle is built on those answers.",
      "code_label": "Gift code",
      "email_label": "Your email (we send your bundle here)",
      "button": "Get my plan",
      "error_invalid": "We couldn't find that code. Check it against the card and try again.",
      "error_used": "This code has already been used. If that's not right, reply to the gift card email and we'll check.",
      "success": "Code accepted. Next, the questions about you."
    },
    "success_page": {
      "headline": "Your gift is on its way",
      "body": "We've emailed the gift card to you. Forward it to them or print it. The code never expires."
    }
  },
  "pd": {
    "landing": {
      "eyebrow": "Give a pescatarian plan",
      "headline": "Give them a plan made for them, not a guess",
      "subhead": "If someone you love is starting to eat pescatarian, give them a calm, clear first week. Their own numbers, their own meals, their medicines checked, all built on their answers.",
      "what_they_get": [
        "A 7-day pescatarian plan built on their age, size, activity and goals",
        "Their own daily numbers, so they know how much is enough",
        "Meals with real fish, seafood and everyday foods, in real amounts",
        "If they take any medicines, the plan flags what to ask their doctor or pharmacist about"
      ],
      "how_it_works": [
        "You buy the gift and add a short note. We email you a gift card with a unique code.",
        "You forward the email to them, or print the card and give it to them.",
        "They enter the code, answer a few minutes of questions about themselves, and get their own plan."
      ],
      "form_labels": {
        "your_name": "Your name",
        "your_email": "Your email (we send the gift card here)",
        "their_first_name": "Their first name",
        "note": "A note from you (optional)",
        "note_placeholder": "I know you've wanted to eat more fish. I thought you should have a plan that fits you.",
        "note_help": "This goes on the gift card. A sentence or two is enough."
      },
      "button": "Buy the gift, $29",
      "price_line": "$29, one time. The same personalized plan they'd buy for themselves.",
      "fine_print": "The code works once and never expires. They answer the questions themselves, so the plan is built on their information. The plan is educational and does not replace advice from their doctor.",
      "faq": [
        {
          "q": "What if they take medicines?",
          "a": "The questions ask about medicines and health conditions. If they take any medicines, the plan flags what to ask their doctor or pharmacist about, in plain words, before they start."
        },
        {
          "q": "Does the code expire?",
          "a": "No. The code never expires. They can use it whenever the timing feels right."
        },
        {
          "q": "Can I just send it to them?",
          "a": "Yes. Forward the gift card email to them, or print the card and hand it over. Everything they need is on it."
        },
        {
          "q": "Can I answer the questions for them?",
          "a": "It's best if they answer themselves. The plan is built on their answers, so the closer those are to their real life, the better it fits."
        }
      ]
    },
    "buyer_email": {
      "subject": "Your pescatarian plan gift for {recipient_name} is ready",
      "preheader": "Forward this email or print the card. The code never expires.",
      "intro": "Your gift is ready. Forward this email to {recipient_name}, or print the card below and give it to them. They enter the code, answer the questions about themselves, and their plan is built on their answers.",
      "after_card": "If anything goes wrong, reply to this email and we'll help."
    },
    "card": {
      "title": "{recipient_name}, a plan built for you",
      "title_no_name": "A pescatarian plan built for you",
      "line_from": "From {buyer_name}",
      "body": "This is a personalized 7-day pescatarian plan, with your own daily numbers and a week of meals. It's built on your answers, including any medicines you take, so it fits your life. The questions take a few minutes.",
      "cta_label": "Start my plan",
      "redeem_instructions": "Go to {url} and enter your code: {code}. It never expires, so start whenever you like."
    },
    "redeem_page": {
      "headline": "Someone wanted you to have this",
      "subhead": "Enter the code from your gift card. Then you'll answer a few questions about yourself, and your plan is built on those answers.",
      "code_label": "Gift code",
      "email_label": "Your email (we send your plan here)",
      "button": "Start my plan",
      "error_invalid": "That code doesn't match one we have. Check it against the card and try again.",
      "error_used": "This code has already been used. If that seems wrong, reply to the gift card email and we'll look into it.",
      "success": "Your code is good. Next, a few questions about you."
    },
    "success_page": {
      "headline": "Your gift is on its way",
      "body": "We've emailed the gift card to you. Forward it to them, or print the card and give it to them. The code never expires, so there's no hurry."
    }
  }
};
