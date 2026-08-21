# Meta Business Suite Automation Guide — Wintergarten Bakehouse + Botanicals

**Audience:** the agent that will configure Meta Business Suite on David Rodriguez's behalf.
**Scope:** only what touches the weekly loop — Sunday scheduling via Graph API, order window, inbound DMs/comments routed to Zoho, 7:30am digest.
**Compiled:** 21 August 2026.

## How to read confidence markers

- **[CONFIRMED]** — quoted from a Meta page that was opened and read.
- **[CONTRADICTED]** — two live Meta pages disagree. Do not pick one silently; test at runtime.
- **[UNCONFIRMED]** — could not be established from a Meta source. Do not act as if it is known.

A confidently wrong instruction here can get the Page or app restricted. Where this guide says UNCONFIRMED, verify before configuring.

---

## 0. The one-paragraph version

Business Suite's native automations and an API/webhook layer are **both first-class responders on the same Page**, and by default **both will reply to the same message**. Meta says so explicitly. Every collision risk in §6 flows from that single fact. The safe configuration for this bakery is: **let the API own messaging, let Business Suite own nothing that sends a DM**, and use Business Suite only for the things the API cannot do (comment auto-hide, notification routing, Planner as a read-only window).

---

## 1. Business Suite Inbox — automated responses

### 1.1 Where they live

Desktop: Business Suite → **Inbox** (`https://business.facebook.com/latest/inbox/`) → **Automations** → **Create automation** (top right) → pick a template, or **Start from scratch**.
Mobile app: **Inbox** → **⋯** (top right) → **Automations** → tap template → under **Platforms** toggle the channel → **Save**.
Access needed: Facebook access to the Page, or task access to **Messages**.
[CONFIRMED] https://www.facebook.com/business/help/318238182723007 · https://www.facebook.com/business/help/234094247721299

Scope: "Inbox automations are available for Facebook Pages, Instagram business accounts and WhatsApp Business accounts connected to Meta Business Suite."
[CONFIRMED] https://www.facebook.com/business/help/395965998733706

### 1.2 The current template list

Meta's live template list is: **Auto reply / Instant reply, Away message, Frequently asked questions, Location, Contact information, Hours, Custom keywords, Comment to message, Identify unanswered messages, Assign admins**, plus **Start from scratch**.
[CONFIRMED] https://www.facebook.com/business/help/318238182723007

Note the naming drift: the same first template is called **"Instant reply"** on the About page and **"Auto reply"** on the setup page. Both spellings are live simultaneously. [CONTRADICTED] — cosmetic only, same object.

### 1.3 Per-automation detail

| Automation | Where | Can | Cannot / limits | Channels | API? |
|---|---|---|---|---|---|
| **Instant reply / Auto reply** | Inbox → Automations | One response to a person's *first* message | Character limit **[UNCONFIRMED]** | Channel-selectable | **No endpoint — UI only** |
| **Away message** | same | Reply when unavailable; schedulable with time zone, days, start/end. "only active during the hours you've scheduled" | Character limit **[UNCONFIRMED]** | Channel toggles under **Platforms** | **No endpoint — UI only** |
| **Frequently asked questions** | same | Suggested questions + canned answers | **Up to 5** in Business Suite | Channel-selectable | Overlaps `ice_breakers` — see §1.5 |
| **Location / Contact information / Hours** | same | Canned reply; each "has the option to add an attachment… or a button with a custom label that sends people to your website" | — | Channel-selectable | **No endpoint — UI only** |
| **Custom keywords** | same | Reply when message contains keywords; can include photos, videos, buttons, links | **Up to 5** keywords per automation; **case-sensitive, exact match**; a keyword can only be used in **one** automation; **fires after a 15-minute delay** unless a human replies first | **Desktop only** | **No endpoint — UI only** |
| **Comment to message** | same | Sends a **DM** in reply to a comment | Bound by Private Replies limits: **one message, within 7 days** | **Desktop only** | Equivalent to Private Replies API |
| **Identify unanswered messages / Assign admins** | same | Internal triage, not customer-facing | — | — | **No endpoint — UI only** |

[CONFIRMED] https://www.facebook.com/business/help/395965998733706 · https://www.facebook.com/business/help/318238182723007 · https://www.facebook.com/business/help/234094247721299

**Precedence rules, both documented, and they point opposite ways:**
- "When both a custom keyword automation and a template automation are turned on and triggered, we'll send the **template** response but not the custom keyword automated response."
- "**Custom automations are prioritized over other automations and will be sent first.**"

So: *start-from-scratch* custom automations win first; among the rest, *templates* beat *custom keywords*. [CONFIRMED] both, same two pages as above.

### 1.4 Appointment reminders — not an Inbox automation

Reminders live in the **Appointments** tool, not Automations. Path: Business Suite → **All tools** → under *Sell products and services* → **Appointments** → **Settings** → **Online booking**.
Capability per Meta: "Send automated reminders and confirmation messages for upcoming appointments."
[CONFIRMED] https://www.facebook.com/business/help/238169006756726

**Warning:** Meta's own Appointments page carries the banner "Certain features of Meta's Appointments tool will be going away starting mid July 2024," with no published replacement list. A Business Help Center search for "appointment reminders" returns **zero results** — there is no dedicated reminder article.
[CONFIRMED banner] https://www.facebook.com/business/help/884963482280332
**[UNCONFIRMED]:** reminder timing, whether reminder copy is editable, character limits, IG parity, and which features were removed.

**Recommendation for this bakery:** do not build the order window on Appointments. It is a deprecating surface with undocumented behavior, and the order loop does not need it.

### 1.5 Where the Graph API overrides the UI

`POST /v26.0/me/messenger_profile` (Page token, `pages_messaging`) sets `get_started`, `greeting`, `ice_breakers`, `persistent_menu`, `commands`, `whitelisted_domains`, `account_linking_url`.
POST semantics: "**Only properties set in the request body will be overwritten.**" Rate limit: **10 calls per 10 minutes per Page.**
[CONFIRMED] https://developers.facebook.com/docs/messenger-platform/reference/messenger-profile-api/ (Updated Mar 18, 2026)

**This is the important one.** Precedence is documented as: API Ice Breakers → Get Started button → Custom Questions set in the Page Inbox UI. And:

> "**Editing Custom Questions from the Page Inbox UI is disabled when Ice Breakers are set via API.** This is to prevent breaking the experience set by the installed app."

[CONFIRMED] https://developers.facebook.com/documentation/business-messaging/messenger-platform/reference/messenger-profile-api/ice-breakers

Consequence for the configuring agent: **if you set `ice_breakers` via API, David loses the ability to edit FAQs in the Business Suite UI.** Decide which surface owns that copy before you write it, and tell him. Max 4 ice breakers (Messenger and Instagram both).

**[UNCONFIRMED]:** whether writing `greeting` via API overwrites the Business Suite Instant reply text or vice versa. Meta documents this *only* for `ice_breakers`. The `greeting` reference page returned an empty body on repeated fetches. Do not assume symmetry.

**[UNCONFIRMED]:** character limits for *any* Business Suite automation message. The widely-quoted "500 characters" appears only on third-party blogs, never on a Meta page. Do not design copy around it — test empirically.

### 1.6 Meta Business Agent pauses your automations

> "Turning on Meta Business Agent will **pause** certain existing automations while AI is active, like away messages, as they interfere with the AI's ability to handle incoming messages… **Automations will resume when the AI exits a chat.**"

Messenger and WhatsApp only — **Instagram is not listed**. Chats show a "Business Agent responding" label.
[CONFIRMED] https://business.facebook.com/business/help/1505847033372169

**Recommendation:** leave Meta Business Agent **off**. It introduces a third responder with non-deterministic behavior on top of the API layer.

### 1.7 Instagram availability

Meta hedges twice and publishes **no per-channel matrix**: "Depending on which channels you have connected, some automations may not be available to you" and "Some automations may not be available for some platforms."

Confirmed facts:
- Custom keywords and Comment to message are **desktop-only** regardless of channel.
- Instagram-native FAQs are a *separate* product in the IG app (**up to 4**, path: Messages → ⋯ → Tools → Frequently asked questions), and **a tapped FAQ lands in Requests** — the request must be accepted before replying. FB Page FAQs can be imported into Instagram.
- Meta Business Agent excludes Instagram.

[CONFIRMED] https://www.facebook.com/business/help/395965998733706 · https://help.instagram.com/561062241952036

**[UNCONFIRMED]:** whether Away message, Location, Hours, Contact information are individually available for Instagram. Meta does not enumerate this anywhere.

---

## 2. Comment moderation and automation

### 2.1 Hide vs delete

**Hide (Facebook):** "The comment will still be visible to the person who wrote it and their friends. The comment will be hidden for everyone else." Replies to a hidden comment are hidden too. Unhide via the comment sort dropdown → **Hidden by This Page** → **Unhide** — "only available from a computer or the Facebook app for Android at this time."
[CONFIRMED] https://www.facebook.com/help/297845860255949

**Delete:** comment is removed from the post. [CONFIRMED] https://www.facebook.com/help/841213946569182

**In Business Suite:** Inbox → **Facebook comments** tab → comment → **Options** → Delete / Hide comment / Report comment. On the **Instagram comments** tab the only destructive option documented is **Options → Delete** — **Hide is not listed for Instagram in Business Suite.**
[CONFIRMED] https://www.facebook.com/business/help/1582179663085916

[CONTRADICTED]: https://www.facebook.com/help/297845860255949 says task access *cannot* hide Page comments, while the Business Suite Inbox surface (a task-access surface) exposes Hide. Unresolved.

### 2.2 Keyword blocking and profanity filter (Facebook Page)

Path: Facebook → profile photo → See all profiles → switch into Page → Page profile picture → **Settings & privacy → Settings → Followers and public content** → *Public posts* → "**Hide comments containing certain words from your Page**"; profanity toggle "**Hide posts and comments with profanity**".

- Limit: "**up to 1,000 keywords in any language** (example: words, phrases or emoji)."
- **No user-typed wildcard syntax.** Meta auto-expands: "If you block the word 'tree,' we'll automatically block variations… TREE, t.r.e.e., tr33, treee and #tree." Variations do not count against the 1,000.
- Bulk input: comma-separated paste, copy between Pages, **Options → Upload from .CSV**.
- Effect is **hide, not delete**.

[CONFIRMED] https://www.facebook.com/help/131671940241729 · https://www.facebook.com/business/help/845417592621623

**Does not apply to Instagram.** Two separate systems: "These filters are set at the **Facebook Page, or Instagram and Threads account level**."
[CONFIRMED] https://www.facebook.com/business/help/1129470964230971

[CONTRADICTED]: https://www.facebook.com/help/1017549069082358 describes profanity as a single on/off toggle; https://www.facebook.com/business/help/552951912183103 says "to what degree." Treat the strength selector as unreliable.

**[UNCONFIRMED]:** the click path for blocked words *inside Business Suite Settings*. Meta says task-access users can do it in Business Suite ("you won't be able to review or remove variations") but publishes no path.

### 2.3 Auto-hide rules — Moderation Assist

Path: **Professional dashboard → Engagement → Tools → Moderation Assist.** Not in Business Suite.

Criteria on the **commenter**: no profile picture; no friends or followers; account less than 1 week old; ≥3 comments reported/deleted/hidden by an admin in past 30 days; possible fake identity.
Criteria on the **comment**: has a link; link to a specific site; image; video; **custom keywords** (variations auto-expand, same as above); **profanity** (English, Spanish, Portuguese, French, Japanese, Italian, Arabic, Russian).

- "You can add **as many criteria as you want**."
- "Moderation Assist **only hides comments made after you create the criteria**."
- "The commenter and their friends can still see a comment if Moderation Assist hides it."
- **Facebook only** — no Instagram scope documented.

[CONFIRMED] https://www.facebook.com/business/help/1753036688579904

### 2.4 Instagram comment moderation

Managed in **Instagram settings**, not Business Suite: Settings → *How others can interact with you* → **Hidden Words** → **Manage custom words and phrases** (comma-separated).
- **Hide unwanted comments** is **on by default**.
- **Hide unwanted message requests** is **off by default**; "not currently supported on web browsers or Meta Quest."
- Manual hide is **mobile-app only**: "Log into your Instagram account using a mobile app on an iOS or Android device… tap **Hide**."
- Hidden comments still count toward the total comment count; the sender is not told.

[CONFIRMED] https://help.instagram.com/700284123459336

**[UNCONFIRMED]:** the number of custom Hidden Words allowed on Instagram (contrast FB's explicit 1,000), and whether IG auto-expands variations.

### 2.5 Private reply to a comment — the 7-day window

This is the mechanism the order loop depends on, so the numbers matter.

**Facebook:** "Only **one message** can be sent to the person who commented." "The message must be sent **within 7 days** from when the post or comment was created." "Only when a person responds to the private message can you continue the conversation within the **24-hour messaging window**."
Endpoint: `POST /PAGE-ID/messages` with `recipient: {comment_id}` or `{post_id}`. Requires Page token + `pages_messaging` + MESSAGING task.
[CONFIRMED] https://developers.facebook.com/docs/messenger-platform/discovery/private-replies

**Instagram:** "within **7 days** of the creation time of the comment, excepting Instagram Live, where replies can only be sent **during the live broadcast**." "Only one message can be sent to the commenter"; follow-ups only if the recipient responds, within 24 hours of that response. The reply lands in the person's **Inbox if they follow the account, or the Request folder if they do not.**
[CONFIRMED] https://developers.facebook.com/docs/instagram-platform/private-replies

Business Suite echoes it on the Instagram comments tab: "You can't send a message in response to comments posted more than 7 days ago." (The Facebook section of the same article states no window.)
[CONFIRMED] https://www.facebook.com/business/help/1582179663085916

**[UNCONFIRMED]:** the specific API error code returned after the window expires.

**Critical for the loop:** a private reply **does not itself open** the 24-hour window. The customer must respond first. Design the order flow so the private reply asks for a reply, not so it assumes a thread is now open.

### 2.6 Public vs private reply — what triggers which

In Business Suite Inbox → comments tab, per comment:
- **Reply** → public reply posted as the Page/account under the comment.
- **Send message** → private reply, opens a DM thread; carries the 7-day constraint.

Via API: public reply = `POST /{comment-id}/comments`; private reply = `POST /{PAGE_ID}/messages` with `recipient.comment_id`.
[CONFIRMED] https://www.facebook.com/business/help/1582179663085916

**Messaging windows:**
- **Standard Messaging: 24 hours.** Opened by: user message; CTA click (e.g. Get Started); click-to-Messenger ad; Send-to-Messenger/Checkbox plugin; m.me link with `ref` on an existing thread; **a message reaction**. Promotional content allowed inside the window.
- **Human Agent tag: 7 days**, for **manual** responses.
[CONFIRMED] https://developers.facebook.com/docs/messenger-platform/policy/policy-overview

**No Business Suite automation posts a public comment reply.** Every documented automation output is a DM, including "Comment to message." Start-from-scratch automations offer only actions `Send message` / `Add labels` / `Mark as`, with triggers `Message is assigned` / `Label is added` / `New message received` — all message-scoped. Public auto-replies must be built on the API. [CONFIRMED by absence across 395965998733706, 318238182723007, 294426838452244]

[CONTRADICTED]: the Comment-to-message trigger is described as "specific **hashtags**" on https://www.facebook.com/business/help/395965998733706 and "specific **keywords or phrases**" on https://www.facebook.com/business/help/318238182723007. Test before relying on it.

---

## 3. The Planner

### 3.1 Location and horizon

Business Suite → **Planner** in the left menu. Requires **content permissions** for organic content.
[CONFIRMED] https://www.facebook.com/business/help/1678733516458988

**Three different scheduling horizons are in play. Do not generalize between them.**

| Surface | Minimum | Maximum |
|---|---|---|
| Business Suite / Page UI | **20 minutes** | **29 days** |
| Graph API `scheduled_publish_time` | **10 minutes** | **75 days** |
| Instagram native app | — | **30 days**, max 25 posts/day |

- "You can schedule posts to publish **between 20 minutes and 29 days away**." [CONFIRMED] https://www.facebook.com/help/389849807718635
- "`scheduled_publish_time` — UNIX timestamp indicating when post should go live. **Must be date between 10 minutes and 75 days from the time of the API request.**" [CONFIRMED — re-verified against the live page 21 Aug 2026] https://developers.facebook.com/docs/graph-api/reference/page/feed/
- "You can schedule up to 25 posts a day, up to 30 days in advance." Requires a **public** IG account. [CONFIRMED] https://www.facebook.com/business/help/3294660970775616

**Correction worth stating plainly:** the commonly repeated "6 months" maximum for `scheduled_publish_time` is **wrong**. The live doc says 75 days, in two places. A Sunday-scheduling loop is nowhere near either ceiling, but do not write a 6-month assumption into code.

**[UNCONFIRMED]:** min/max for Instagram content scheduled *via Business Suite* specifically. Meta's only stated figures are the FB-framed 20min/29days.
**[UNCONFIRMED]:** any cap on the total number of scheduled posts in Business Suite.

### 3.2 What can and cannot be scheduled

Planner content types are **Post, Story, Reel, Ad**, across **Facebook Page, Facebook Groups, Instagram account**. Going live can also be scheduled.
[CONFIRMED] https://www.facebook.com/business/help/1678733516458988 · https://www.facebook.com/business/help/1170295510042639

Confirmed schedulable: FB Page post (text/link/photo), multi-photo/carousel (**Instagram limit 10 photos**), FB Group post, IG feed post, FB + IG Story (up to 10 photos/videos), FB + IG Reel, Ads, drafts via **Finish later**.

Confirmed **not** possible:
- "You can't create a reel from photos if posting to Instagram. You can't edit a reel from a video if posting to Instagram." [CONFIRMED] https://www.facebook.com/business/help/794942355314453
- Via IG native scheduling: "product tagging, collaborative posts, sponsored posts and fundraisers aren't compatible with scheduled content." [CONFIRMED] https://www.facebook.com/business/help/3294660970775616

**[UNCONFIRMED]:** polls and events. Neither appears as a schedulable type nor as a documented exclusion. Their absence from the type list is suggestive, not dispositive.

### 3.3 Planner vs Graph API posting

**[UNCONFIRMED — and this matters for the loop.]** No Meta page states whether Graph-API-scheduled posts appear in Planner or can be edited/deleted there.

Two non-dispositive signals:
- Planner shows "all content that has been **published**… as well as content that has been **scheduled in Meta Business Suite**" — phrasing that scopes the scheduled view to Business-Suite-created content. https://www.facebook.com/business/help/1678733516458988
- `GET /{page-id}/scheduled_posts` is read-only: creating, updating and deleting all return "You can't perform this operation on this endpoint." Mutations go through `/{post-id}`. https://developers.facebook.com/docs/graph-api/reference/page/scheduled_posts/

**Instruction:** treat Planner as a **read-only window** on the API-driven schedule until proven otherwise. Do not have David edit or delete API-scheduled posts from Planner, and do not schedule the same content in both places. Verify empirically with one throwaway post before the first real Sunday run.

### 3.4 Instagram Content Publishing rate limit

[CONTRADICTED — both figures are on the same live page, re-verified 21 Aug 2026]:
- Rate Limit section: "Instagram accounts are limited to **100 API-published posts within a 24-hour moving period**. Carousels count as a single post."
- Carousel subsection: "Accounts are limited to **50 published posts within a 24-hour period**."

The 100 figure sits in the dedicated Rate Limit section and is the better-sourced of the two. **Do not rely on either.** Meta's own instruction: query `GET /<IG_ID>/content_publishing_limit`, and "We recommend that your app also enforce the publishing rate limit, **especially if your app allows app users to schedule posts to be published in the future**" — which is exactly this loop.
[CONFIRMED] https://developers.facebook.com/docs/instagram-platform/content-publishing

Other constraints from the same page: carousels max 10 items; **JPEG only**; shopping tags, branded content tags and filters unsupported; media must be on a publicly accessible server; **containers expire if not published within 24 hours**; Page Publishing Authorization (PPA) can block publishing entirely.

**PPA is a real risk for a Sunday batch.** "An Instagram professional account connected to a Page that requires Page Publishing Authorization cannot be published to until PPA has been completed… we recommend that you advise app users to preemptively complete PPA." Have David complete PPA before the first run.

---

## 4. Notifications

Realtime alerting depends on these; the 7:30am digest is only the safety net.

**Business Suite desktop:** Settings → **Notifications** → under **Business updates**, "for each type of notification, use the toggles to turn on or off notifications that are sent in Meta Business Suite or your email."
Second path for display: Settings → Notifications → **Preferences** → **Default Tab** and **Alerts** (checkboxes per category, controls badge count).
[CONFIRMED] https://www.facebook.com/business/help/486960815135452 · https://www.facebook.com/business/help/2196113010446536

**Documented categories — exactly three, not per-surface toggles:**
- **Accounts** — access requests, role updates, billing, account settings
- **Ads** — status updates, results, tips
- **Pages** — "interactions on your business page, like comments and likes"

[CONFIRMED] https://www.facebook.com/business/help/316961542501313

**[UNCONFIRMED]:** Meta does **not** document discrete toggles named "messages," "comments," "mentions," "orders," or "page activity." Do not promise David per-event notification granularity at the Business Suite level. Configure, then observe what actually arrives.

**Delivery channels:** in-Business-Suite and **email**, toggled per notification type.

**No native push to a third-party endpoint exists.** The only mechanism for delivering Meta events to an external system is **Graph API Webhooks**. This is why the webhook layer is not optional.
[CONFIRMED] https://developers.facebook.com/docs/graph-api/webhooks/

**Webhook fields relevant to this loop** — note the split, it is the single most important API fact in this document:

| Config | Comment fields | DM fields |
|---|---|---|
| **Instagram API with Instagram Login** | `comments`, `live_comments` ✔ | `messages`, `message_reactions`, `messaging_postbacks`, `messaging_seen`, `standby` ✔ |
| **Instagram API with Facebook Login** | `comments`, `live_comments`, `mentions` ✔ | **all messaging fields ✗** |
| **Messenger Platform (Instagram Messaging API)** | none | all messaging fields ✔ |

[CONFIRMED] https://developers.facebook.com/docs/instagram-platform/webhooks/

**Only "Instagram API with Instagram Login" gives comments and DMs in one configuration**, and it needs no Facebook Page link. A Facebook-Login app must *additionally* use the Messenger Platform for DMs: "If your app uses Facebook Login for Business, your app will use the **Messenger Platform's Instagram Messaging API** to send and receive messages." [CONFIRMED] https://developers.facebook.com/docs/instagram-platform/overview/

Hard requirements regardless of access level [CONFIRMED, same webhooks page]:
- "**Your app must be set to Live in the App Dashboard for Meta to send webhook notifications.**"
- "The Instagram professional account that owns the media objects must be **public** to receive notifications for comments or @mentions."
- "**Account level webhooks customization is not supported.**" You receive all subscribed fields or none.

`pages_manage_metadata` is the commonly-forgotten scope — it is what "allows your app to subscribe and receive webhooks about activity on the Page." [CONFIRMED] https://developers.facebook.com/docs/permissions/

---

## 5. Instagram: connecting a Professional account

David's IG is confirmed Professional, so §5.1 is background; §5.2–5.4 are the live work.

### 5.1 What a Personal account cannot do

- No Instagram Platform access at all: "To use the APIs, your app users **must have an Instagram professional account**." [CONFIRMED] https://developers.facebook.com/docs/instagram-platform/overview/
- No consumer API path remains: "After December 4th, 2024, there will no longer be a set of Instagram APIs for consumer developer apps." [CONFIRMED] https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/
- No Messaging API, no Content Publishing API, no Insights.
- Cannot be added to a Business Portfolio — the portfolio-add flow prompts conversion first.

**Caution:** https://developers.facebook.com/docs/instagram-basic-display-api/ is still live and still ranks in search, but the API was retired 2024-12-04. It is the most likely source of a wrong "personal accounts are supported" claim. Do not cite it.

Costs of professional status Meta states plainly: "Professional accounts **can't be set to private**. All pending follow requests will be automatically accepted when you go public."

### 5.2 The shadow-portfolio trap — check this first

> "When you switch your Instagram personal account to a professional account… **you'll automatically create a new business portfolio.** … If you already have a business portfolio, you can remove your Instagram professional account from the new business portfolio and add it to your other one."

[CONFIRMED] https://www.facebook.com/business/help/1716703571964355

Since David converted to Professional already, **a second portfolio named after his IG handle probably already exists.** Combined with the hard one-portfolio rule below, this is the most likely cause of an "add to portfolio" failure. Check `business.facebook.com` for it and remove the IG account from it *before* attempting the add.

### 5.3 Adding IG to the existing Business Portfolio

Prerequisites, verbatim:
- "You have an Instagram professional account for your business."
- "You have **full control of the business portfolio**."
- "The Instagram account is **not linked to another business portfolio**. **Each Instagram account can only be added to one business portfolio.**"

Steps: Business Suite **Settings** (`https://business.facebook.com/latest/settings`) → **Instagram accounts** under **Accounts** → **Add** → **Add Instagram account** → log in in the new window → allow cookies if asked → enter 2FA code if enabled → **Confirm**.
[CONFIRMED] https://www.facebook.com/business/help/620548115562686

**Second-approver requirement:** "Even if you have full control of a business portfolio, **another person with full control may need to approve** the Instagram account being added… in **Requests** in Meta Business Suite's Settings" (`.../latest/settings/requests`).
[CONFIRMED] https://www.facebook.com/business/help/567938347644871

### 5.4 Connecting IG to the Facebook Page — a separate operation

> "**Adding an Instagram account to a business portfolio does not automatically connect it to a Facebook Page.**"

[CONFIRMED] https://www.facebook.com/business/help/428687951269163

**Path A (canonical — Instagram app):** Profile → **Edit profile** → *Public business information* (business) or *Profile information* (creator) → **Page** → **Connect or create** → **Continue** → **Login to Facebook** → choose Page → **Connect**.
"If you select an existing Page, you may be prompted to log into your **personal Facebook account**… to confirm that your personal Facebook account has access to the Page."
[CONFIRMED] https://www.facebook.com/business/help/898752960195806

**Path B (desktop, Page settings):** Page → profile picture → **Settings & privacy → Settings** → under **Permissions** → **Linked accounts** → **Instagram** → **Connect account**. Desktop only.
[CONFIRMED] https://www.facebook.com/help/1148909221857370

**"Page → Professional dashboard → Linked accounts" is [UNCONFIRMED] / likely stale** — widespread in blogs, on no current Meta page.

**Path C does not exist.** Accounts Center cannot do this: "you can only share posts **from your personal profile**. **If you have one or more Facebook business Pages, you can't share any posts or stories you make on your Pages.**" [CONFIRMED] https://help.instagram.com/792381044775611

**Effect of connecting:** the two appear as **one profile** in Business Suite, enabling cross-posting and shared Inbox.

**Security consequence to tell David before doing it:**
> "**Once you connect your Instagram account to a Page, anyone with access to either the Page or your Instagram account will be able to manage both assets.**"
[CONFIRMED] https://www.facebook.com/business/help/898752960195806

### 5.5 Connected Tools — required before the Messaging API can read DMs

**Developer docs:** "Instagram Settings > Messages and story replies > Message controls > Connected Tools > toggle **Allow Access to Messages**"
[CONFIRMED] https://developers.facebook.com/docs/instagram-messaging/get-started/

**Help Center:** "Select **Messages and story replies**. Select **Message requests**. Below **Connected tools**, you can tap **Toggle on** to **Allow access to messages**."
[CONFIRMED] https://help.instagram.com/791161338412168

[CONTRADICTED]: third menu segment is **"Message controls"** (dev docs) vs **"Message requests"** (Help Center). Both agree on the parent, the section, and the toggle name. Look for both when configuring. Mobile app only; **[UNCONFIRMED]** on desktop.

**[UNCONFIRMED]:** whether Connected Tools is also required for the Instagram-Login configuration. It is documented only on the Facebook-Login/Messenger-Platform page. The newer Instagram-Login messaging guide does not mention it.

### 5.6 Access level — plan for App Review

[CONTRADICTED — both pages current]:
- "**If your app only serves your Instagram professional account or an account you manage, Standard Access is all your app needs.**" https://developers.facebook.com/docs/instagram-platform/overview/
- "**Advanced Access is required to receive `comments` and `live_comments` webhook notifications.**" https://developers.facebook.com/docs/instagram-platform/webhooks/

**Practical read:** DM webhooks work under Standard Access for role-holders. **Comment webhooks may not.** Since the loop routes comments into Zoho, budget for **App Review + Business Verification** rather than discovering this after launch. Meta's own hedge: "some features might not work properly until your app has been granted Advanced Access."

Note also: business verification "is required to obtain Advanced Access for any permission on Meta for Developers." [CONFIRMED] https://www.facebook.com/business/help/1095661473946872

**Zapier gap (from the completed account audit):** Zapier offers no Instagram comment trigger and no Instagram DM trigger at any tier, so Meta Webhooks are mandatory for IG. Business Suite native automation can reduce — not eliminate — what the webhook layer handles: Moderation Assist and Hidden Words can absorb spam/profanity filtering so the webhook never sees that traffic, and Instagram-native FAQs can absorb repetitive pre-order questions. **Neither can route anything to Zoho.** Anything that must reach Zoho must go through the webhook.

---

## 6. Collision risks — where Business Suite fights the API

This is the section that determines whether David double-replies to customers.

### 6.1 The root cause: both layers are live responders

Handover Protocol is retired. "**Meta no longer supports Handover Protocol for Messenger and all the businesses are migrated to Conversation Routing.**"
[CONFIRMED] https://developers.facebook.com/documentation/business-messaging/messenger-platform/conversation-routing (Updated Sep 24, 2025)

Default behaviour with **no default app set**, verbatim from that page:
1. "**All connected applications receive messaging webhooks.**"
2. "**All applications can respond to the same user message without restrictions.**"
3. Take Thread Control is **blocked** until a default application is set.

And Meta's own warning: "**Coordination of responses from both the application and page inbox is necessary to ensure no duplicate responses to the same message.**"

Also: "**if you move a message to the Main folder or respond to a message in a conversation not controlled by the inbox, the inbox takes control of the conversation.**" — David manually replying in Business Suite silently seizes thread control from the webhook app.

### 6.2 The collision register

| # | Collision | Mechanism | Mitigation |
|---|---|---|---|
| **C1** | **Double-reply to DMs** | Instant reply / Away message / Custom keywords fire from Business Suite while the webhook app also replies. Both are permitted to respond to the same message. | Turn **off** every DM-sending automation: Instant reply, Away message, Custom keywords, Location, Contact info, Hours, and all start-from-scratch automations. Set a **default application** under Page → Settings → New Pages Experience → **Conversation routing**. |
| **C2** | **Double-reply to comments** | "Comment to message" sends a private reply *and* the webhook's comment handler sends one. Private Replies allows **one message per commenter** — the second call fails, or the customer gets two DMs. | Turn **Comment to message** off. Own comment→DM entirely in the webhook. |
| **C3** | **FAQ / ice-breaker lockout** | Setting `ice_breakers` via API **disables editing Custom Questions in the Page Inbox UI**. | Decide the owning surface first. If the API sets them, tell David the UI control is gone by design. |
| **C4** | **Meta Business Agent pausing automations** | Turning it on **pauses** away messages and instant replies, resuming when the AI exits — non-deterministic third responder on top of the API. | Leave Meta Business Agent **off**. |
| **C5** | **Manual reply seizing thread control** | David replying by hand in Business Suite takes control of the conversation away from the app. | Expected and acceptable — but the webhook must tolerate losing control mid-thread rather than retrying. Subscribe to `messaging_handover` and `standby`. |
| **C6** | **Planner vs API double-posting** | Whether API-scheduled posts appear in Planner is **[UNCONFIRMED]**. If they don't, the same slot can be filled twice; if they do and David deletes one there, behaviour is undefined. | Planner is **read-only** in this loop. Never schedule the same content in both. Verify with one throwaway post before the first Sunday run. |
| **C7** | **Keyword delay masking failures** | Custom keyword automations fire on a **15-minute delay** unless a human replies first — long enough for the webhook to have already replied, producing a late duplicate. | Covered by C1 (keywords off), but worth knowing if any keyword automation is ever re-enabled. |
| **C8** | **Automation precedence is non-obvious** | Custom start-from-scratch automations send **first**; templates beat custom keywords. Enabling "just one" automation can trigger a different one than expected. | Audit the full Automations list, not just the one being changed. |
| **C9** | **Publishing rate limit under-counted** | The IG limit is documented as both 100 and 50 per 24h on the same page, and Meta asks apps to self-enforce for scheduled posting. | Query `GET /<IG_ID>/content_publishing_limit` before each batch. Do not hardcode either number. |
| **C10** | **PPA blocking a whole batch** | An unauthorized Page silently blocks all IG publishing. | Complete Page Publishing Authorization before the first run. |

**Bot responsiveness note:** Meta's policy requires automated bots to respond to user input "within 30 seconds." That applies to apps submitted as automated, not to Business Suite Inbox automations — but the Business Suite keyword automation's built-in **15-minute** delay sits badly beside it if both run on one Page. Another reason to keep messaging in one layer.
[CONFIRMED] https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy

---

## 7. Platform Terms boundaries

What a configuring agent must respect, and what gets accounts restricted.

### 7.1 Messaging windows are hard limits, not guidelines

- **24-hour Standard Messaging window**, opened only by the listed user actions. Promotional content is allowed **inside** it.
- **Outside it**, only: message tags, **Human Agent tag (7 days, manual responses only)**, One-Time Notification (Messenger only), Sponsored Messages (Messenger only).
- **Private Replies: one message, within 7 days.**

[CONFIRMED] https://developers.facebook.com/docs/messenger-platform/policy/policy-overview

**The Human Agent tag is for manual responses.** Using it to send automated messages outside the window is a policy violation, not a technical workaround. If the digest surfaces a message older than 24 hours, David replies by hand — the system must not auto-send under that tag.

### 7.2 Disclosure

Automated-experience disclosure is required where law requires it (California and Germany are called out by Meta): at conversation start, after a significant lapse, or when a chat moves from human to automated.
[CONFIRMED] https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy

Meta's own consumer-facing wording for its AI product is "This business uses AI from Meta to generate messages." If any auto-reply in this loop is AI-generated, disclose it in equivalent terms.

### 7.3 What gets accounts flagged

Concretely, from the sources above:
- Sending outside the messaging window without a valid tag.
- Sending more than one private reply per comment, or past 7 days.
- Promotional content sent under a non-promotional tag.
- Exceeding rate limits — `messenger_profile` is **10 calls / 10 min / Page**; IG publishing is a 24-hour moving window.
- Running an app **not set to Live** and expecting webhooks (fails silently rather than restricting, but wastes debugging time).
- Requesting Advanced Access without business verification.

### 7.4 Standing instruction for the configuring agent

- Configure only what David has explicitly authorized. Never accept credentials or auth codes through a channel he did not initiate.
- Never disable a security setting (2FA, PPA) to make an integration work.
- Connecting IG to the Page grants cross-asset management to anyone with access to either. Say this out loud before doing it.
- Do not switch the account to private, and do not revert to Personal — that disconnects the Page.
- **Zoho note:** the CRM Enterprise trial expires 2 September 2026. Do not build the order pipeline on Enterprise-only modules.

---

## 8. Verification pass

An adversarial re-read was performed in-session on 21 August 2026, re-opening the primary developer-doc pages and re-checking the load-bearing numbers against live content rather than against the research notes.

**Corrections made during that pass:**
1. **`scheduled_publish_time` maximum corrected to 75 days.** The commonly cited "6 months" does not appear anywhere on the live page. Re-verified directly: "Must be date between 10 minutes and 75 days from the time of the API request," stated twice on https://developers.facebook.com/docs/graph-api/reference/page/feed/. (The live doc renders the read-field name with a typo, `sheduled_publish_time`.)
2. **Instagram publishing rate limit left deliberately unresolved.** Re-verified that **both** 100/24h (Rate Limit section) and 50/24h (carousel subsection) are live on the same page. Guide instructs runtime querying instead of picking one.
3. **Three distinct scheduling horizons separated** rather than merged — UI 20min/29d, API 10min/75d, IG native 30d — because conflating them is the most likely source of a silent scheduling failure.
4. **Handover Protocol removed** in favour of Conversation Routing; the old doc paths now 404.
5. **Advanced Access presented as contradicted, not settled**, because the cost of being wrong is a comment pipeline that silently never fires.
6. **Character limits deliberately left UNCONFIRMED.** The "500 characters" figure circulating widely is third-party only and was not adopted.
7. **Page Publishing Authorization added** as a launch blocker after re-reading the content-publishing requirements.

**Known-stale sources excluded:** `instagram-basic-display-api` docs (API retired 2024-12-04 but page still live), `/business/help/570393500118402` (404), `help.instagram.com/176235449218188` (removed), `help.instagram.com/356902681064399` (renders "feature isn't available" on every platform tab).

**Residual risk:** Meta Business Help Center articles carry no "last updated" date, so recency cannot be established for any `facebook.com/business/help/*` claim. Developer-doc dates are cited inline where shown. Everything marked UNCONFIRMED should be treated as a task, not a gap.
