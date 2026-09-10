/* content.js — Drill material: prompts, frameworks, readings, twisters, words, filler lists.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

/* ══ CONTENT ══════════════════════════════════════════════════════ */

export const PROMPTS = [
  "Describe a decision you got wrong, and what you’d tell someone facing the same choice.",
  "What’s something most people believe that you think is quietly false?",
  "Explain your work to a curious twelve-year-old.",
  "Talk about a person who changed how you think. Don’t say they were 'inspiring' — say what they did.",
  "What’s a skill you’d want to be excellent at in five years, and what’s stopping you today?",
  "Argue for a rule you’d abolish.",
  "Describe your hometown to someone who will never visit it.",
  "What does a good day look like for you, hour by hour?",
  "Tell the story of the last time you were genuinely surprised.",
  "Defend something you enjoy that other people find boring.",
  "What’s the hardest thing you’ve had to explain to somebody?",
  "If you had to teach one lesson to a room of strangers, what would it be?",
  "Describe a place you go when you need to think.",
  "What’s a piece of advice you were given that turned out to be wrong?",
  "Talk about something you owned for a long time and finally let go of.",
  "Explain why you chose the path you’re on. Be honest about the accidents.",
  "What’s a problem in your field that nobody talks about enough?",
  "Describe the best meal you’ve eaten, without using the word 'delicious'.",
  "Convince someone to start a habit you’ve kept.",
  "What did you believe strongly at eighteen that you’ve since abandoned?",
  "Tell me about a time you were the least experienced person in the room.",
  "What’s overrated? Take a real position and defend it.",
  "Describe a sound you’d miss if it disappeared.",
  "Explain a mistake you keep making.",
  "What would you do with a completely free year?",
  "Talk about someone you disagree with, fairly.",
  "Describe how you’d fix your morning routine.",
  "What’s a small thing that consistently makes you happy? Say why.",
  "Explain the last thing you learned that changed your behaviour.",
  "Make a case for doing something slowly.",
  "Tell the story of a journey that didn’t go to plan.",
  "What’s a compliment you received that you didn’t believe?",
  "Describe your relationship with your phone.",
  "Argue that failure is overrated as a teacher.",
  "What’s a tradition you’d invent if you could?",
  "Explain something you’re afraid of, and where it came from.",
  "Describe a conversation you wish you’d handled differently.",
  "What’s the most useful book, film, or video you’ve encountered? Why?",
  "Talk about money without mentioning a number.",
  "What’s something you’re better at than you were a year ago?",
  "Describe the room you’re sitting in as if it were a film set.",
  "Explain why people procrastinate, using yourself as the case study.",
  "What would you put on a billboard seen by a million people?",
  "Describe an ordinary object as though it were extraordinary.",
  "Talk about a rivalry — friendly or otherwise — that pushed you.",
  "What’s a question you wish people asked you more often?",
  "Explain how to do something you can do without thinking.",
  "Describe the best feedback you’ve ever received.",
  "What do you want to be known for?",
  "Make an argument you don’t personally agree with, as well as you can."
];

export const FRAMEWORKS = [
  { id:"prep", name:"PREP", why:"Best for opinions and arguments.",
    steps:[
      {t:"Point",   h:"State your answer in one sentence.", w:.18},
      {t:"Reason",  h:"Why you hold it.",                   w:.27},
      {t:"Example", h:"One concrete story or fact.",        w:.37},
      {t:"Point",   h:"Restate it. Then stop.",             w:.18}
    ]},
  { id:"star", name:"STAR", why:"Best for interview and experience questions.",
    steps:[
      {t:"Situation", h:"Where and when.",         w:.2},
      {t:"Task",      h:"What was at stake.",      w:.2},
      {t:"Action",    h:"What you actually did.",  w:.42},
      {t:"Result",    h:"How it ended. Numbers if you have them.", w:.18}
    ]},
  { id:"wsn", name:"What / So what / Now what", why:"Best for reflections and updates.",
    steps:[
      {t:"What",     h:"The plain facts.",              w:.3},
      {t:"So what",  h:"Why it matters to the listener.", w:.4},
      {t:"Now what", h:"The consequence or next step.",   w:.3}
    ]},
  { id:"time", name:"Past / Present / Future", why:"Best for stories and introductions.",
    steps:[
      {t:"Past",    h:"Where it started.",   w:.32},
      {t:"Present", h:"Where it stands now.",w:.36},
      {t:"Future",  h:"Where it’s heading.", w:.32}
    ]},
  { id:"ccv", name:"Claim / Counter / Verdict", why:"Best when the question is contested.",
    steps:[
      {t:"Claim",   h:"Your position, stated flat.",       w:.28},
      {t:"Counter", h:"The strongest objection to it.",    w:.34},
      {t:"Verdict", h:"Why you still land where you land.",w:.38}
    ]}
];

/* Passages for pace and pause work. "|" marks a deliberate breath.
   Originals unless credited; Lincoln (1863) is public domain. */
/* Passages for Pace & Pause. Long on purpose: the drill measures whether you
   can hold a steady pace and take real breaths, and neither shows up in twenty
   seconds. At roughly 150 words a minute these run 60–110 seconds, which is
   long enough for the pace to drift and for you to feel yourself correct it.
   The | marks are breath points — stop fully at each one. */
/* Filler Hunt draws from here, not from PROMPTS. The other drills want a prompt
   that makes you think; this one wants the opposite. Thinking is where "um"
   comes from, so a topic you have to work out would be measuring the wrong
   thing. These need no preparation, no opinion and no structure — you already
   know the answer, so the only question left is how cleanly you can say it.
   Each one opens outwards, because sixty seconds is a long time to fill and
   running dry mid-run produces the fillers we are trying to observe. */
export const EASY_PROMPTS = [
  "Describe your morning, from waking up to leaving the house. Every step, in order.",
  "Talk me through making your usual drink — tea, coffee, whatever it is. Assume I've never made one.",
  "Describe the room you're in right now. Furniture, light, what's on the walls, what's out of place.",
  "Walk me through your route to work or school, turn by turn, as though I had to follow it.",
  "Describe the last meal you ate. What was in it, how it was cooked, whether it was any good.",
  "Talk about a place you know well — your street, your school, a shop you always go to. What is it like?",
  "Explain how to get from your front door to the nearest shop, without using a map.",
  "Describe someone you see often. What they look like, how they talk, what they always say.",
  "Talk about what you did last weekend, hour by hour, starting from Saturday morning.",
  "Describe your phone's home screen. Which apps, where they sit, which ones you actually open.",
  "Explain a game you know how to play — the rules, how you win, what beginners get wrong.",
  "Talk about the weather this week and what it changed about your day.",
  "Describe the last thing you watched or read. What happened in it, from the beginning.",
  "Explain how to do something you do without thinking — tying a lace, making a bed, locking up.",
  "Talk about your journey to this room today. Where you came from, how long it took, what you passed.",
  "Describe a photo on your phone you could find in ten seconds. Who's in it and what was happening.",
  "Talk about what you'll do after this. The rest of today, in order, as far as you've planned it.",
  "Describe the shop you buy food from. The layout, where things are, what you always pick up.",
  "Explain to a visitor what your town or city is like, and where you'd send them first.",
  "Talk about a routine you repeat every week. What it involves and why it's arranged that way.",
  "Describe what's in your bag or your pockets right now, item by item, and why each one is there.",
  "Talk about the last time you cooked something. What you made, what went in, what you'd change.",
];

export const READINGS = [
  { t:"On being understood", s:"", x:"The purpose of speech is not to prove that you know something. | It is to move an idea from one head into another | without losing its shape on the way. | Every extra word is friction. | Every unnecessary clause is a place where the listener can slip. | Say the thing, | then stop talking, | and let the silence do the underlining. | Most people speak as though they are being graded on effort. | They add qualifications nobody asked for, | and hedges that guard against objections | which were never coming. | The result sounds careful | and lands as noise. | Try the opposite. | Decide the one sentence you want the room to repeat afterwards, | and build everything else as a road towards it. | If a phrase carries no weight, | cut it before it reaches your mouth. | You will feel exposed doing this, | because there is nowhere to hide in a plain sentence. | That exposure is the point. | Clarity is a form of courage, | and a room hears courage | long before it follows an argument." },

  { t:"The Gettysburg Address", s:"Abraham Lincoln, 1863", x:"Four score and seven years ago | our fathers brought forth on this continent a new nation, | conceived in liberty, | and dedicated to the proposition | that all men are created equal. | Now we are engaged in a great civil war, | testing whether that nation, | or any nation so conceived and so dedicated, | can long endure. | We are met on a great battlefield of that war. | We have come to dedicate a portion of that field | as a final resting place for those who here gave their lives | that that nation might live. | It is altogether fitting and proper that we should do this. | But in a larger sense | we cannot dedicate, | we cannot consecrate, | we cannot hallow this ground. | The brave men, living and dead, who struggled here | have consecrated it far above our poor power to add or detract. | The world will little note nor long remember what we say here, | but it can never forget what they did here. | It is for us the living rather | to be dedicated here to the unfinished work | which they who fought here have thus far so nobly advanced. | It is rather for us to be here dedicated to the great task remaining before us: | that from these honoured dead we take increased devotion to that cause | for which they gave the last full measure of devotion; | that we here highly resolve that these dead shall not have died in vain; | that this nation shall have a new birth of freedom; | and that government of the people, | by the people, | for the people, | shall not perish from the earth." },

  { t:"The weight of a pause", s:"", x:"A pause is not an absence. | It is an instrument. | Placed before a word, | it makes that word arrive heavier. | Placed after, | it gives the listener room to agree with you. | Amateurs fear silence and fill it with noise. | Professionals spend it deliberately, | the way a good photographer spends light. | The difficulty is that a pause feels far longer from the inside. | Two seconds of quiet, | standing in front of a room, | feels like a failure of memory. | To everyone listening | it reads as composure. | That gap between how it feels and how it lands | is the single largest free improvement available to a speaker. | You do not have to be cleverer. | You do not have to be louder. | You have to be willing to stop | at the end of a thought | and let it sit there | while the room catches up with you. | Practise it where nothing is at stake, | so that when something is, | your mouth already knows how." },

  { t:"Instructions for a nervous speaker", s:"", x:"Before you begin, | breathe out completely. | Not in — out. | The panic you feel is mostly a chest full of unused air. | Then look at one friendly face, | say your first sentence to that person alone, | and let the rest of the room overhear it. | A speech is a conversation | that happens to have witnesses. | Your hands will shake. | Let them. | Nobody is watching your hands; | they are waiting to find out whether this will be worth their time, | and you answer that in the first twenty seconds | with your pace, | not your content. | Go slower than feels natural. | Nervousness accelerates you, | so what feels like a crawl from the inside | is usually about right from the outside. | If you lose your place, | stop and say so plainly. | Say, let me find that again. | The room forgives a pause instantly | and remembers a scramble for a long time. | The goal is not to feel calm. | The goal is to be understood | while not feeling calm." },

  { t:"The plain style", s:"", x:"Short words, | in short sentences, | in a steady voice. | It sounds too simple to be impressive, | which is exactly why it works. | Complexity in speech is usually a hiding place. | If you cannot say it plainly, | you may not yet know what you mean, | and the room can always tell. | Watch what happens when someone stops performing. | The hedges disappear. | The sentences get shorter. | The pace steadies, | because they are no longer composing and speaking at the same time. | You can hear the difference from across a room, | and you can hear it in a recording of yourself | more clearly than you would like. | Plain is not the same as simple. | A plain sentence can carry a difficult idea; | it just refuses to decorate it. | Decoration is what we add | when we are less sure of the idea than we want to appear. | Strip it out | and what remains is either solid | or obviously not — | which is useful either way." },

  { t:"What confidence actually is", s:"", x:"Confidence is not the absence of fear, | and it is not the belief that you will do well. | It is a much smaller thing: | familiarity. | You have been here before, | so your body has stopped treating the room as a threat. | That is all. | It is built, | not summoned, | and it is built in the least glamorous way available — | by doing the thing badly, | repeatedly, | where it does not matter. | This is why advice to just be confident is useless. | It describes the destination | and hides the road. | The road is a recording you did not enjoy listening to, | followed by another one that was slightly less bad. | It is noticing that you say so at the start of every answer, | and then catching yourself doing it, | and then not doing it. | People who seem naturally comfortable in front of a room | have almost always been in front of a lot of rooms. | What looks like temperament | is usually just mileage." },

  { t:"On listening", s:"", x:"Most people do not listen while another person is speaking. | They wait, | holding a sentence they are afraid of forgetting, | scanning for the gap where it will fit. | You can see the moment it happens: | the eyes change focus, | and the conversation quietly becomes two monologues | taking turns. | The fix is uncomfortable but simple. | Let the sentence go. | If it was any good, | it will come back when it is relevant, | and if it does not come back | it was probably not worth the exchange you traded for it. | What you get in return is the ability to answer | what was actually said, | rather than what you were braced for. | This matters for speaking, | not just for manners. | A person who listens properly | needs fewer words, | because they are responding to the real question | instead of covering every question it might have been. | Precision comes from attention. | You cannot be concise about something | you only half heard." },

  { t:"The first draft", s:"", x:"The first draft has one job: | to exist. | It is not supposed to be good, | and treating it as though it should be | is the most reliable way to never finish anything. | Write it badly, | say it badly, | get the shape of it out where you can see it. | You cannot edit a thought that is still in your head. | The same is true out loud. | The first time you explain an idea to another person | it will come out tangled, | with the important part arriving third | and the setup taking too long. | That is not a sign the idea is weak. | It is the ordinary cost of hearing yourself say it for the first time. | The second explanation is always shorter. | The fourth is usually good. | So find cheap places to spend those first attempts — | a colleague, | a walk, | a recording nobody else will hear — | rather than spending them in the room | where the answer actually counts." },

  { t:"A clear apology", s:"", x:"A useful apology has no maybe in it, | no if in it, | and no paragraph explaining the circumstances | that made it understandable. | It names the thing, | says the cost to the other person, | and states what happens next. | Anything beyond that is usually you asking to be forgiven quickly, | which is a request, | not an apology. | The hardest part is resisting the explanation. | You will feel a strong pull to establish that you are not careless, | that there were reasons, | that a reasonable person might have done the same. | All of that may be true. | None of it belongs in the first thirty seconds. | Context is something you offer afterwards, | if you are asked for it. | Say what happened. | Say what it cost. | Say what you are doing about it. | Then stop, | and let the silence be uncomfortable, | because it is supposed to be. | An apology that ends in a defence | is a defence." },

  { t:"Attention", s:"", x:"Attention is a vote you cast with your time, | and unlike most votes it is counted immediately. | Whatever you attend to grows. | Whatever you neglect quietly shrinks | until one day you notice it is gone. | This is true of skills, | of relationships, | and of the small habits of speech | that either sharpen or blur | depending entirely on whether you ever listen to yourself. | The uncomfortable part is that attention cannot be faked | and cannot be borrowed. | You can appear to be listening. | You can nod at the right intervals. | But the quality of what you say next | will give you away completely, | because a real answer can only be built | out of something you actually took in. | So the practical question is never | how do I seem more engaged. | It is narrower and harder: | what am I willing to stop doing | in order to be here properly | for the next ten minutes." },

  { t:"The room", s:"", x:"Before you speak, | notice the room. | How far away is the back wall. | How many people are there. | Whether the air is dead or live, | because a carpeted room swallows a voice | and a hard one throws it back at you. | Speakers who sound good in every space | are not using the same voice everywhere; | they are adjusting, | usually without thinking about it, | because they have been in enough rooms to feel the difference. | Aim at the far wall, | not at the nearest face. | Almost everyone under-projects, | and the reason is social rather than physical: | speaking loudly enough to reach the back | feels like shouting at the front. | It is not. | Ask someone at the back afterwards | and they will tell you they strained to hear. | Volume is not aggression. | It is a courtesy you extend | to the people who chose the worst seats | and still came. | Do it once at the start | and you will not have to think about it again, | because the room tells you immediately | whether it reached the back." },

  { t:"A calmer pace", s:"", x:"Speaking slowly is not the same as speaking well, | and slowing down uniformly | is not the goal. | The goal is variation. | A steady rhythm with no changes in it | reads as a recitation, | however clear each word is. | What holds a listener | is speed that responds to the material — | quicker through the parts they already accept, | slower through the part that does the work. | Try it deliberately. | Take a sentence that matters | and give it half your normal pace, | with a full stop of silence on either side. | The room will lean in without knowing why. | Then move on at ordinary speed, | so the slow part stays rare enough to mean something. | Most nervous speakers do the reverse. | They rush the important sentence, | because it is the one that frightens them, | and then linger over the setup | where they feel safe. | Notice which parts you are hurrying. | That is usually where the content is." },
];

export const TWISTERS = [
  { x:"She sells sea shells by the sea shore.", f:"s / sh" },
  { x:"Red lorry, yellow lorry, red lorry, yellow lorry.", f:"r / l" },
  { x:"The sixth sick sheikh’s sixth sheep’s sick.", f:"s / th" },
  { x:"Peter Piper picked a peck of pickled peppers.", f:"p" },
  { x:"How much wood would a woodchuck chuck if a woodchuck could chuck wood.", f:"w / ch" },
  { x:"Unique New York, you know you need unique New York.", f:"n / y" },
  { x:"Betty Botter bought some butter but she said the butter’s bitter.", f:"b / t" },
  { x:"A proper copper coffee pot.", f:"p / k" },
  { x:"Three thin thieves thought a thousand thoughts.", f:"th" },
  { x:"Which wristwatches are Swiss wristwatches.", f:"w / s" },
  { x:"Truly rural, truly rural, truly rural.", f:"r / l" },
  { x:"Good blood, bad blood, good blood, bad blood.", f:"bl" },
  { x:"The seething sea ceaseth and thus the seething sea sufficeth us.", f:"s / th" },
  { x:"Eleven benevolent elephants.", f:"l / v" },
  { x:"I slit the sheet, the sheet I slit, and on the slitted sheet I sit.", f:"sl / sh" },
  { x:"Six sleek swans swam swiftly southwards.", f:"s / sw" },
  { x:"Freshly fried flying fish, freshly fried flesh.", f:"fr / fl" },
  { x:"A big black bug bit a big black bear and made the big black bear bleed.", f:"b" },
  { x:"Pad kid poured curd pulled cod.", f:"consonant clusters" },
  { x:"Imagine an imaginary menagerie manager imagining managing an imaginary menagerie.", f:"m / n / g" },
  { x:"Lesser leather never weathered wetter weather better.", f:"l / w / th" },
  { x:"Send toast ten tense stout saints ten tall tents.", f:"t / s / n" }
];

/* Precise, high-utility words — the kind that make speech sharper, not showier. */
export const WORDS = [
  { w:"nuance",       d:"a small but meaningful difference in meaning or tone", e:"There’s a nuance here that the summary misses." },
  { w:"concede",      d:"to admit a point is true, often reluctantly",          e:"I’ll concede that the timing was bad." },
  { w:"premise",      d:"the assumption an argument is built on",               e:"The premise is wrong, so the conclusion doesn’t hold." },
  { w:"tangible",     d:"real and measurable; something you can point to",      e:"We need a tangible result, not a feeling." },
  { w:"reconcile",    d:"to make two conflicting things fit together",          e:"I can’t reconcile what he said with what he did." },
  { w:"compelling",   d:"persuasive enough that you can’t easily dismiss it",   e:"She made a compelling case for waiting." },
  { w:"arbitrary",    d:"chosen without a real reason",                         e:"The deadline is arbitrary, so we can move it." },
  { w:"inherent",     d:"built into something’s nature; not added on",          e:"There’s an inherent risk in going first." },
  { w:"pragmatic",    d:"focused on what works rather than what’s ideal",       e:"Let’s be pragmatic about the budget." },
  { w:"ambivalent",   d:"holding two opposing feelings at once",                e:"I’m ambivalent — I want it and I dread it." },
  { w:"substantiate", d:"to back a claim with evidence",                        e:"Can you substantiate that number?" },
  { w:"scope",        d:"the boundary of what’s included",                      e:"That’s outside the scope of this conversation." },
  { w:"contingent",   d:"depending on something else happening first",          e:"My answer is contingent on what they decide." },
  { w:"undermine",    d:"to weaken something gradually from below",             e:"Constant corrections undermine his authority." },
  { w:"explicit",     d:"stated directly, leaving nothing implied",             e:"Be explicit about what you need from me." },
  { w:"redundant",    d:"unnecessary because it repeats something",             e:"The second paragraph is redundant." },
  { w:"deliberate",   d:"done on purpose, with care",                           e:"That pause was deliberate." },
  { w:"plausible",    d:"believable, though not proven",                        e:"It’s plausible, but I’d want to check." },
  { w:"trivial",      d:"so small it doesn’t affect the outcome",               e:"The cost difference is trivial." },
  { w:"coherent",     d:"holding together logically",                           e:"I want a coherent story, not a list of events." },
  { w:"leverage",     d:"the advantage that lets a small effort move something big", e:"We have more leverage than we’re using." },
  { w:"marginal",     d:"only slightly above the threshold that matters",       e:"The improvement was marginal." },
  { w:"candid",       d:"honest in a way that costs you something",             e:"Let me be candid about where we are." },
  { w:"provisional",  d:"true for now, expected to change",                     e:"Treat this as a provisional plan." },
  { w:"disproportionate", d:"far larger or smaller than it should be",          e:"The reaction was disproportionate to the mistake." },
  { w:"consensus",    d:"agreement everyone can live with",                     e:"We reached consensus, not enthusiasm." },
  { w:"implication",  d:"what follows from something without being said",       e:"I don’t like the implication of that question." },
  { w:"threshold",    d:"the level at which something starts to count",         e:"We haven’t crossed the threshold yet." },
  { w:"corroborate",  d:"to confirm with independent evidence",                 e:"Two other people corroborate her account." },
  { w:"succinct",     d:"expressed in few words, with nothing missing",         e:"Give me the succinct version." },
  { w:"salient",      d:"the detail that stands out and matters most",          e:"The salient point is that nobody asked." },
  { w:"hedge",        d:"to soften a statement to avoid committing",            e:"Stop hedging and tell me your actual view." },
  { w:"anecdotal",    d:"based on individual stories rather than data",         e:"That’s anecdotal, but it’s worth noticing." },
  { w:"culminate",    d:"to build steadily to a final point",                   e:"Six months of work culminated in one demo." },
  { w:"discern",      d:"to perceive a difference that isn’t obvious",          e:"I couldn’t discern any change in tone." },
  { w:"latitude",     d:"freedom to act within loose limits",                   e:"Give the team some latitude on the method." },
  { w:"attribute",    d:"to name the cause or source of something",             e:"I’d attribute the delay to the handover." },
  { w:"prospective",  d:"potential; not yet real",                              e:"She’s a prospective partner, not a signed one." },
  { w:"reticent",     d:"reluctant to speak, especially about yourself",        e:"He was reticent about why he left." },
  { w:"unequivocal",  d:"admitting no possible doubt",                          e:"That was an unequivocal no." }
];

/* Lines with strong, natural cadence — good models to shadow. */
export const ECHOES = [
  "I don’t have the answer yet, but I know how I’d find it.",
  "Let me be clear about what I’m actually proposing.",
  "That’s a fair question, and I think the honest answer is no.",
  "We tried it twice, and both times it failed for the same reason.",
  "I’d rather be slow and right than quick and wrong.",
  "There are three things going on here, and only one of them is urgent.",
  "I hear the concern, and I don’t think it’s misplaced.",
  "What changed my mind was seeing it happen in front of me.",
  "The simplest explanation is usually the one nobody wants.",
  "I’ll take responsibility for that, and here’s what I’m doing about it.",
  "Before we decide, I want to make sure we agree on the problem.",
  "It worked, but I’m not confident I know why.",
  "Give me one minute and I’ll tell you exactly where we stand.",
  "I don’t think we disagree — I think we’re answering different questions.",
  "The number looks good until you ask what it’s measuring.",
  "I was wrong about that, and I should have said so earlier.",
  "Every option here costs something. Let’s pick which cost we prefer.",
  "If it matters that much, it deserves more than a hallway conversation.",
  "I’d like to hear the strongest version of the opposing case.",
  "We can do it properly, or we can do it Friday. Not both."
];

/* Extended practice bank: enough variation to keep repeat sessions useful. */
PROMPTS.push(
  "What is a small expense that is worth paying for, and why?",
  "Describe a time a simple plan solved a complicated problem.",
  "What makes someone easy to work with? Give a real example.",
  "If you could change one rule at school or work, what would it be?",
  "Explain a belief you hold that took you a long time to form.",
  "Describe the last time you changed your mind after hearing someone out.",
  "What should people prepare before a difficult conversation?",
  "Make the case for taking a walk without your phone.",
  "What is a problem people try to solve too quickly?",
  "Describe a routine that saves you time or energy.",
  "What makes a meeting useful instead of exhausting?",
  "Tell the story of a purchase you researched carefully.",
  "What is one local change that would improve your neighbourhood?",
  "Explain why a first impression can be misleading.",
  "Describe an event that looked minor but changed your plans.",
  "What is the difference between being busy and making progress?",
  "Argue for writing things down instead of trusting memory.",
  "Describe a time you had to ask for help and what happened.",
  "What is a useful thing you learned from a bad job or project?",
  "Explain how you decide whether advice is worth taking.",
  "What is an everyday skill that deserves more respect?",
  "Describe your ideal way to spend a free evening.",
  "What does a fair disagreement look like?",
  "Tell the story of an unexpected delay and how you handled it.",
  "What is something you would improve about public spaces?",
  "Make a case for leaving some decisions until tomorrow.",
  "Describe a person who is very good at explaining things.",
  "What is the best way to recover after a disappointing day?",
  "Explain a choice that seemed small but had a large consequence.",
  "What should a new team member learn in their first week?",
  "Describe an old habit you are trying to replace.",
  "What is a question people should ask before making a big purchase.",
  "Argue that curiosity is more useful than confidence.",
  "Describe a moment when being patient paid off.",
  "What makes a promise trustworthy?",
  "Explain how you would welcome someone new to your city."
);

TWISTERS.push(
  {x:"Rory the warrior and Roger the worrier were reared wrongly in a rural brewery.",f:"r / w"},
  {x:"Black back bat, black back bat, black back bat.",f:"bl / b"},
  {x:"Crisp crusts crackle and crunch.",f:"kr / k"},
  {x:"Toy boat, toy boat, toy boat.",f:"t / b"},
  {x:"The thirty-three thieves thought that they thrilled the throne throughout Thursday.",f:"th / r"},
  {x:"Fred fed Ted bread and Ted fed Fred bread.",f:"fr / br"},
  {x:"Seven savvy swamis swiftly swept snow.",f:"s / sw"},
  {x:"Clive cleans clever clams with clean cloths.",f:"kl / cl"},
  {x:"Brave blue birds blinked beneath bright branches.",f:"br / bl"},
  {x:"Dense drums drummed during dawn.",f:"d / dr"},
  {x:"Five frantic frogs fled from fifty fierce fish.",f:"f / fr"},
  {x:"Greg grabbed green grapes greedily.",f:"gr / g"},
  {x:"Tiny trains travel through three thorny tunnels.",f:"tr / th"},
  {x:"Quick queens quietly question quirky quails.",f:"kw / k"},
  {x:"Bright brass bells buzzed beside blue buses.",f:"br / bz"},
  {x:"Nina neatly numbered ninety-nine narrow notebooks.",f:"n"},
  {x:"Vivid violet violets vanish very violently.",f:"v"},
  {x:"Zoe's zesty zebra zigzagged through the zoo.",f:"z"},
  {x:"Paul packed polished plates in plain paper.",f:"p / pl"},
  {x:"Shy sheep should share shiny shells.",f:"sh / s"}
);

WORDS.push(
  {w:"adapt",d:"to change your approach to fit new conditions",e:"We need to adapt the plan to the new deadline."},
  {w:"advocate",d:"to publicly support an idea or cause",e:"She will advocate for a simpler process."},
  {w:"allocate",d:"to assign a limited resource for a purpose",e:"We should allocate more time to testing."},
  {w:"anticipate",d:"to expect something and prepare for it",e:"I anticipate questions about the cost."},
  {w:"assess",d:"to judge a situation carefully",e:"Let us assess the risk before we commit."},
  {w:"clarify",d:"to make something easier to understand",e:"Could you clarify what success looks like?"},
  {w:"collaborate",d:"to work together toward a shared result",e:"The two teams need to collaborate earlier."},
  {w:"constraint",d:"a limit that shapes what is possible",e:"Budget is our main constraint this quarter."},
  {w:"credible",d:"believable because it has good support",e:"We need a credible explanation for the delay."},
  {w:"criteria",d:"standards used to judge a choice",e:"Let us agree on the criteria before comparing options."},
  {w:"decisive",d:"able to settle an issue or produce a result",e:"The customer interview was decisive evidence."},
  {w:"defer",d:"to postpone something until later",e:"We can defer that decision until Friday."},
  {w:"derive",d:"to get something from a source or process",e:"The estimate was derived from last year's data."},
  {w:"differentiate",d:"to show how one thing differs from another",e:"We need to differentiate the product clearly."},
  {w:"diligent",d:"careful and persistent in your work",e:"She was diligent about documenting every change."},
  {w:"evaluate",d:"to examine value or quality",e:"We should evaluate the pilot before expanding it."},
  {w:"feasible",d:"possible to do with the resources available",e:"The proposal is ambitious but feasible."},
  {w:"friction",d:"an unnecessary difficulty in a process",e:"That extra form adds friction for new users."},
  {w:"incentive",d:"something that encourages a choice or action",e:"The bonus creates an incentive to finish early."},
  {w:"initiative",d:"the ability to act without being told",e:"He showed initiative by solving the issue first."},
  {w:"iterate",d:"to improve through repeated versions",e:"We will iterate on the design after feedback."},
  {w:"justify",d:"to give a good reason for something",e:"Can we justify the extra expense?"},
  {w:"mitigate",d:"to make a risk or harm less severe",e:"A backup supplier would mitigate the risk."},
  {w:"objective",d:"a clear goal or aim",e:"Our objective is to reduce the response time."},
  {w:"perceive",d:"to notice or understand something",e:"Customers may perceive the change as unfair."},
  {w:"prioritize",d:"to decide what deserves attention first",e:"We need to prioritize the issues affecting users."},
  {w:"resilient",d:"able to recover after difficulty",e:"The system needs to be resilient during outages."},
  {w:"resolve",d:"to settle a problem or disagreement",e:"We can resolve this with one clear decision."},
  {w:"sustain",d:"to keep something going over time",e:"The pace is useful only if we can sustain it."},
  {w:"validate",d:"to confirm that something is sound or true",e:"The trial will validate our assumption."}
);

ECHOES.push(
  "I can explain the trade-off, but I cannot make it disappear.",
  "The question is not whether we can do it; it is whether we should.",
  "I want to separate what we know from what we are guessing.",
  "That solution is fast, but it creates work for someone else.",
  "If we change the deadline, we should say what we are protecting.",
  "I understand the urgency, and I still think we need one more day.",
  "The problem became smaller when we stated it precisely.",
  "I am not asking for perfection; I am asking for a clear next step.",
  "We should hear the objection before we congratulate ourselves.",
  "The plan is simple enough to explain, which makes it easier to trust.",
  "I made an assumption there, and it deserves to be checked.",
  "The most expensive option is not always the one with the largest price.",
  "I would rather give you a careful answer than an immediate one.",
  "This is uncomfortable because the choice has a real cost.",
  "We have a decision to make, not another meeting to schedule.",
  "The detail matters because it changes the conclusion.",
  "I can support that approach if we define the boundary first.",
  "Nothing improves until someone is willing to name the problem.",
  "The evidence is incomplete, but it is not meaningless.",
  "Let us make the smallest decision that moves us forward.",
  "I hear two separate concerns, and they need two separate answers.",
  "The useful part of feedback is the part we can act on.",
  "We do not need more ideas; we need to choose one and test it.",
  "A clear no is more helpful than a vague maybe.",
  "The risk is real, but so is the cost of doing nothing.",
  "I want to be accurate before I try to be persuasive.",
  "This is the point where a short pause will help us think.",
  "The goal is not agreement at any cost; it is a workable decision.",
  "We can disagree about the method and still agree about the outcome.",
  "The answer changed when we looked at the actual constraint."
);

PROMPTS.push(
  "What is one thing people misunderstand about your work or studies?",
  "Describe a risk you would take only after preparing carefully.",
  "What makes an apology convincing?",
  "Tell the story of a day when a plan changed at the last minute.",
  "What should be measured before a team decides it is improving?",
  "Describe a place that feels different at two times of day.",
  "Make a case for learning a practical skill by hand.",
  "What is a better response to criticism than becoming defensive?",
  "Explain how you would choose between two equally good opportunities.",
  "Describe a small act of kindness you still remember.",
  "What would make your commute or daily travel better?",
  "Argue for fewer choices in one part of daily life.",
  "Describe a time you noticed you were overcomplicating something.",
  "What is a good reason to say no to an opportunity?",
  "Explain the difference between a preference and a principle.",
  "Tell the story of a time you had to start again.",
  "What makes a recommendation genuinely useful?",
  "Describe a useful object you would take on a long trip.",
  "What is one decision you would make differently with more information?",
  "Explain how you know when a task is finished.",
  "What does good customer service or hospitality look like?",
  "Describe a teacher, coach, or manager who made you improve.",
  "Make a case for keeping a physical notebook.",
  "What is a problem that gets worse when people avoid it?",
  "Describe the first hour of a memorable day.",
  "What should people do when they realize they were wrong?",
  "Explain a simple rule you use to make decisions faster.",
  "Describe a time you were proud of someone else.",
  "What makes a room feel welcoming?",
  "Argue for taking breaks before you feel exhausted.",
  "Describe something you learned by watching another person work.",
  "What does a strong ending to a conversation sound like?",
  "Explain why details can matter more than big ideas.",
  "Describe a challenge you would happily do again.",
  "What is worth doing even when you are not naturally good at it?",
  "Tell the story of a time you had to be more direct than usual.",
  "What would you improve about how people give instructions?",
  "Explain what makes you trust a source of information.",
  "Describe a hobby you would recommend to a busy person.",
  "What is one change that would make tomorrow easier?"
);

TWISTERS.push(
  {x:"Slippery slimy snails slid slowly seaward.",f:"sl / s"},
  {x:"Silly Sally swiftly shooed seven silly sheep.",f:"s / sh"},
  {x:"Thirteen thirsty thinkers thanked Theo thoroughly.",f:"th"},
  {x:"Blue blooming blossoms blew beneath the bridge.",f:"bl / br"},
  {x:"Craig's crisp crackers crumbled quickly.",f:"kr / k"},
  {x:"Frank freely fried fresh French fries.",f:"fr"},
  {x:"Loud loyal lions lounged lazily in London.",f:"l"},
  {x:"Molly mixed many mellow mangoes.",f:"m"},
  {x:"Nine nimble nurses neatly knit new napkins.",f:"n"},
  {x:"Proud printers promptly printed purple posters.",f:"pr / p"},
  {x:"Quiet queens quickly quilt quirky quilts.",f:"kw"},
  {x:"Rough red roses rarely rise rapidly.",f:"r"},
  {x:"Silver snakes silently slide through sand.",f:"s / sl"},
  {x:"Twelve tiny turtles tiptoed toward town.",f:"t"},
  {x:"Walter wisely washed white winter wool.",f:"w"},
  {x:"Yellow yachts yawned yearly in York.",f:"y"},
  {x:"Zany zebras zipped past zigzagging zones.",f:"z"},
  {x:"Breezy brown branches brushed bright bricks.",f:"br"},
  {x:"Charming children cheerfully chased cheese.",f:"ch"},
  {x:"Daring drivers drove down dusty drives.",f:"dr / d"}
);

WORDS.push(
  {w:"accurate",d:"correct and free from mistakes",e:"The report is accurate enough to share."},
  {w:"ambiguous",d:"open to more than one meaning",e:"That instruction is ambiguous, so people may interpret it differently."},
  {w:"approximate",d:"close to the true amount but not exact",e:"The approximate cost is lower than we expected."},
  {w:"assumption",d:"something accepted as true without proof",e:"Our forecast depends on one major assumption."},
  {w:"benchmark",d:"a standard used for comparison",e:"Last quarter gives us a useful benchmark."},
  {w:"capacity",d:"the maximum amount someone or something can handle",e:"We do not have the capacity to take on both projects."},
  {w:"coincide",d:"to happen at the same time",e:"The launch will coincide with the annual event."},
  {w:"compatible",d:"able to work well together",e:"The two systems are not compatible yet."},
  {w:"comprehensive",d:"including all important parts",e:"We need a comprehensive view before deciding."},
  {w:"concurrent",d:"happening at the same time",e:"Three concurrent deadlines made the week difficult."},
  {w:"consistent",d:"reliable and the same over time",e:"The results have been consistent for months."},
  {w:"context",d:"the circumstances that give something meaning",e:"That comment sounds different in context."},
  {w:"contradict",d:"to say the opposite of something",e:"The new evidence does not contradict the earlier finding."},
  {w:"contribute",d:"to add something that helps produce a result",e:"Several small issues contributed to the delay."},
  {w:"conventional",d:"based on what is usually done",e:"The conventional approach may be too slow here."},
  {w:"crucial",d:"extremely important to the outcome",e:"Clear ownership is crucial at this stage."},
  {w:"cumulative",d:"increasing through repeated additions",e:"The cumulative effect is larger than one mistake."},
  {w:"decline",d:"to become less or refuse an offer",e:"We should decline the request if the timing is wrong."},
  {w:"define",d:"to state the exact meaning or limits of something",e:"Please define what you mean by complete."},
  {w:"demonstrate",d:"to show clearly using evidence or an example",e:"The trial should demonstrate whether the change works."},
  {w:"desirable",d:"worth having or aiming for",e:"Fast feedback is desirable, but not at any cost."},
  {w:"disclose",d:"to reveal information that was previously private",e:"We should disclose the limitation early."},
  {w:"distinct",d:"clearly different from something else",e:"These are two distinct problems."},
  {w:"diverse",d:"including many different kinds",e:"A diverse group will notice different risks."},
  {w:"durable",d:"able to last a long time",e:"We need a durable solution, not a quick patch."},
  {w:"emerge",d:"to become visible or known",e:"A pattern began to emerge after the interviews."},
  {w:"enhance",d:"to improve quality or value",e:"A short guide would enhance the onboarding process."},
  {w:"equivalent",d:"equal in value or meaning",e:"Those two outcomes are not equivalent."},
  {w:"ethical",d:"morally right and responsible",e:"We need an ethical way to use the data."},
  {w:"exceed",d:"to be greater than a limit or expectation",e:"The cost could exceed our original estimate."},
  {w:"exclude",d:"to leave someone or something out",e:"The summary should not exclude the main risk."},
  {w:"expand",d:"to become larger or more detailed",e:"We can expand the program once the pilot succeeds."},
  {w:"facilitate",d:"to make an action easier",e:"The template will facilitate faster reviews."},
  {w:"fundamental",d:"forming the basic foundation of something",e:"Trust is fundamental to good collaboration."},
  {w:"generate",d:"to produce or create something",e:"The workshop should generate several practical ideas."},
  {w:"illustrate",d:"to explain with an example",e:"One short story can illustrate the problem."},
  {w:"implement",d:"to put a plan into action",e:"We can implement the first step this week."},
  {w:"indicate",d:"to show or point to something",e:"The results indicate that users are confused."},
  {w:"inevitable",d:"certain to happen",e:"Some change is inevitable as the team grows."},
  {w:"interpret",d:"to explain the meaning of something",e:"Different people may interpret the message differently."}
);

ECHOES.push(
  "I do not need to solve everything today; I need to solve the next thing well.",
  "The strongest argument is the one that survives a fair question.",
  "We should be honest about what this decision will require.",
  "I can see why that option is appealing, and I still would not choose it.",
  "The situation is changing, so the plan should be allowed to change too.",
  "Let us put the important fact at the beginning, where no one can miss it.",
  "The concern is reasonable, but it does not change the next step.",
  "We will learn more from one real attempt than from another hour of speculation.",
  "I want to leave this conversation with a decision, an owner, and a date.",
  "The message should be simple enough to repeat without changing.",
  "There is no benefit in pretending this part will be easy.",
  "I have heard the feedback, and I can explain what I will do with it.",
  "The plan becomes credible when the first action is concrete.",
  "We need a response that works on an ordinary Tuesday, not only on a good day.",
  "I would not call that a failure until we understand what it taught us.",
  "The decision is reversible, which means we can move with more confidence.",
  "We are using the same word, but we mean two different things by it.",
  "The better choice may be less exciting, but it will be easier to maintain.",
  "I can make the case clearly, even if the answer is not popular.",
  "The value of this idea depends on what happens after the meeting.",
  "We should make room for the person closest to the problem to speak first.",
  "I want the outcome to be clear before we debate the process.",
  "A useful plan includes the signal that tells us when to stop.",
  "The point is not to remove every risk; it is to understand the important ones.",
  "This is a good moment to slow down and check the assumption.",
  "We can be direct without being careless with each other.",
  "The first version is allowed to be small if it is honest.",
  "I have one recommendation, and I can explain the reason behind it.",
  "The easier answer is not always the more responsible one.",
  "We should not confuse activity with evidence of progress."
);

/* Hard fillers are always wrong. Crutch words are legitimate in moderation
   and only count against you when repeated. */
export const HARD = ["um","umm","uh","uhh","er","erm","ah","ahh","hmm","mmm","mm"];
export const CRUTCH = ["like","you know","i mean","sort of","kind of","basically","actually",
  "literally","obviously","honestly","just","stuff","things","whatever","anyway",
  "right","okay so","and stuff","or something","pretty much","i guess","i think"];

export const STOP = new Set(("the a an and or but if of to in on at for with as is are was were be been am "+
  "i you he she it we they me him her them my your his its our their this that these those there here "+
  "do does did have has had will would can could should not no yes so then than what which who whom "+
  "when where why how all any some very just more most other into over about from by up down out").split(" "));
