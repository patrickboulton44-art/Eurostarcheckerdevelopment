# Eurosnap Onboarding Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      LANDING SCREEN                         │
│                                                             │
│              "Euro" ←──────── "snap" →                      │
│                    ↓ snap together ↓                        │
│                     "Eurosnap"                              │
│                    ↓ fade out ↓                             │
│              Hello → Bonjour → Hallo → Привіт...           │
│                                                             │
│                   [ Start Now ]                             │
│              Been here before? Login ──────────┐            │
│                        │                       │            │
└────────────────────────┼───────────────────────┼────────────┘
                         │                       │
                         ▼                       ▼
┌──────────────────────────────┐  ┌──────────────────────────┐
│     STEP 1: ORIGIN           │  │        SIGN IN           │
│                              │  │                          │
│  "Where are you starting?"   │  │  [Continue with Google]  │
│                              │  │         ── or ──         │
│  ○ London St Pancras         │  │  Email: [_________]      │
│  ○ Paris Gare du Nord        │  │  Password: [_______]     │
│  ○ Brussels Midi             │  │                          │
│  ○ Amsterdam Centraal        │  │  [Sign In]               │
│  ○ Rotterdam Centraal        │  │                          │
│  ○ Lille Europe              │  │  Don't have an account?  │
│                              │  │  Start here → homepage   │
│         [Next]               │  │           │              │
└──────────┼───────────────────┘  └───────────┼──────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────────┐         ┌──────────┐
│     STEP 2: DESTINATION      │         │DASHBOARD │
│                              │         └──────────┘
│  "Where are you going?"      │
│                              │
│  Shows valid connections     │
│  for selected origin         │
│                              │
│  FREE: select 1              │
│  PRO:  select multiple ✓     │
│                              │
│  * Pro users can monitor     │
│    multiple destinations     │
│                              │
│     [Back]  [Next]           │
└──────────┼───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     STEP 3: DAYS & TIME      │
│                              │
│  "Which days?"               │
│                              │
│  [Mon][Tue][Wed][Thu]        │
│  [Fri][Sat][Sun]             │
│                              │
│  Time slot:                  │
│  [Any][Morning][Afternoon]   │
│                              │
│  * Weekday and time slot     │
│    filtering is Pro only.    │
│    Free = all days/times.    │
│                              │
│     [Back]  [Next]           │
└──────────┼───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     STEP 4: PASSENGERS       │
│                              │
│  "How many travellers?"      │
│                              │
│  [ 1 ][ 2 ][ 3 ][ 4 ]       │
│                              │
│     [Back]  [Next]           │
└──────────┼───────────────────┘
           │
           ├── If signed in ──────────────┐
           │                              │
           ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────┐
│     STEP 5: ACCOUNT          │  │    STEP 5: CONFIRM       │
│     (not signed in only)     │  │    (signed in)           │
│                              │  │                          │
│  "Create your account"       │  │  "Ready to go"           │
│                              │  │                          │
│  [Continue with Google]      │  │  Route: London → Paris   │
│         ── or ──             │  │  Monitoring: Rolling 3mo │
│  [Sign Up] [Sign In]        │  │  Passengers: 1           │
│                              │  │                          │
│  Name: [________]            │  │  ┌─ Pro features? ─────┐ │
│  Email: [________]           │  │  │ Weekday: Sat, Sun   │ │
│  Password: [______]          │  │  │ Other Pro features:  │ │
│                              │  │  │ • 5 min checks      │ │
│  [Create Account]            │  │  │ • Multi destinations │ │
│         │                    │  │  │ [Upgrade £3.99/mo]   │ │
│         ▼                    │  │  │ Continue with free → │ │
│  ┌──────────────┐            │  │  └─────────────────────┘ │
│  │ Signs in →   │────────────┤  │                          │
│  │ jumps to     │            │  │  [Start Monitoring]      │
│  │ confirm step │            │  │         │                │
│  └──────────────┘            │  └─────────┼────────────────┘
└──────────────────────────────┘            │
                                            ▼
                               ┌──────────────────────────┐
                               │     SUCCESS SCREEN       │
                               │                          │
                               │  Destination-based msg:  │
                               │  🇫🇷 → "Bon Voyage!"     │
                               │  🇬🇧 → "Enjoy your       │
                               │        journey!"         │
                               │  🇳🇱 → "Goede reis!"     │
                               │  🇧🇪 → "Bon Voyage!"     │
                               │                          │
                               │  "When tickets become    │
                               │   available you will be  │
                               │   notified via email."   │
                               │                          │
                               │  ┌── If FREE ──────────┐ │
                               │  │ UPGRADE TO PRO      │ │
                               │  │ • 5 min checks      │ │
                               │  │ • Multi destinations │ │
                               │  │ • Weekday filtering  │ │
                               │  │ • AM/PM preference   │ │
                               │  │ [Upgrade £3.99/mo]   │ │
                               │  └─────────────────────┘ │
                               │                          │
                               │  [Go to Dashboard]       │
                               │  Set up another alert    │
                               └──────────┼───────────────┘
                                          │
                                          ▼
                               ┌──────────────────────────┐
                               │       DASHBOARD          │
                               │                          │
                               │  Tabs:                   │
                               │  [Alerts] [Sent] [Settings]
                               │                          │
                               │  Alerts:                 │
                               │  • Active watchers       │
                               │  • Route, passengers     │
                               │  • + Create another      │
                               │                          │
                               │  Sent:                   │
                               │  • Notification history  │
                               │  • Route, date, time     │
                               │                          │
                               │  Settings:               │
                               │  • Email, name, plan     │
                               │  • [Upgrade to Pro]      │
                               │  • [Account Settings]    │
                               │  • [Change Route]        │
                               │  • [Sign Out]            │
                               └──────────────────────────┘


PAYMENT FLOW (from any Upgrade button):

  [Upgrade to Pro] → Stripe Checkout (£3.99/mo)
         │                    │
         │              [promo code: friends2026]
         │                    │
         ▼                    ▼
    Cancel → /pricing    Success → /dashboard?upgraded=true
                               │
                               ▼
                         "Successfully upgraded to Pro."
```


## Route Change Flow (from Dashboard Settings):

```
  [Change Route] / [Manage Routes]
         │
         ▼
┌──────────────────────────┐
│  "Where are you starting?"│
│                          │
│  ○ London St Pancras     │
│  ○ Paris Gare du Nord    │
│  ...                     │
│                          │
│  [Cancel]  [Next]        │
└──────────┼───────────────┘
           │
           ▼
┌──────────────────────────┐
│  "Where are you going?"  │
│                          │
│  FREE: 1 destination     │
│  PRO: multiple ✓         │
│                          │
│  [Back]  [Save]          │
└──────────┼───────────────┘
           │
           ▼
    Deactivates old watchers
    Creates new watchers
    Dashboard refreshes
```
