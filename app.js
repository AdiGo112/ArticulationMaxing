"use strict";
/* Speakeasy — articulation practice booth.
   No build step, no dependencies, no network. Everything runs in the tab. */

/* ══ 1. CONTENT ══════════════════════════════════════════════════════ */

const PROMPTS = [
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

const FRAMEWORKS = [
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
const READINGS = [
  { t:"On being understood", s:"", x:"The purpose of speech is not to prove that you know something. | It is to move an idea from one head into another | without losing its shape on the way. | Every extra word is friction. | Every unnecessary clause is a place where the listener can slip. | Say the thing, | then stop talking, | and let the silence do the underlining." },
  { t:"The Gettysburg Address", s:"Abraham Lincoln, 1863", x:"Four score and seven years ago | our fathers brought forth on this continent a new nation, | conceived in liberty, | and dedicated to the proposition | that all men are created equal. | Now we are engaged in a great civil war, | testing whether that nation, | or any nation so conceived and so dedicated, | can long endure." },
  { t:"The weight of a pause", s:"", x:"A pause is not an absence. | It is an instrument. | Placed before a word, | it makes that word arrive heavier. | Placed after, | it gives the listener room to agree with you. | Amateurs fear silence and fill it with noise. | Professionals spend it deliberately, | the way a good photographer spends light." },
  { t:"Instructions for a nervous speaker", s:"", x:"Before you begin, | breathe out completely. | Not in — out. | The panic you feel is mostly a chest full of unused air. | Then look at one friendly face, | say your first sentence to that person alone, | and let the rest of the room overhear it. | A speech is a conversation | that happens to have witnesses." },
  { t:"Precision", s:"", x:"There is a difference between a hard problem | and a complicated one. | A hard problem resists you even when you understand it perfectly. | A complicated problem only looks difficult | because nobody has bothered to arrange the pieces. | Most of what we call difficulty in conversation | is the second kind. | It is untidiness, | wearing the costume of depth." },
  { t:"What confidence actually is", s:"", x:"Confidence is not the belief that you will be brilliant. | It is the willingness to be ordinary in public | and keep going anyway. | The confident speaker is not the one without doubt. | They are the one who has decided | that the doubt is not the audience’s problem, | and has agreed to carry it quietly | until the sentence is finished." },
  { t:"On listening", s:"", x:"Most people do not listen with the intent to understand. | They listen with the intent to reply. | You can hear it happening — | the small intake of breath, | the shifting forward, | the answer already assembled | while the other person is still choosing their words. | Real listening looks like patience | and costs about the same." },
  { t:"The plain style", s:"", x:"Short words, | in short sentences, | in a steady voice. | It sounds too simple to be impressive, | which is exactly why it works. | Complexity in speech is usually a hiding place. | If you cannot say it plainly, | you may not yet know what you mean — | and the room can always tell." }
];

const TWISTERS = [
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
const WORDS = [
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
const ECHOES = [
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

READINGS.push(
  {t:"A useful beginning",s:"",x:"The first sentence does not need to be clever. | It needs to be clear. | Tell the room where you are going, | give them one reason to come with you, | and begin walking. | A plain start creates trust. | Once people trust the direction, | they can enjoy the scenery."},
  {t:"Choosing the next step",s:"",x:"When every option feels important, | choose the one that creates information. | A small test is often better than a long debate. | It tells you what the argument cannot: | what happens when an idea meets the real world. | Then make the next decision | with less imagination | and more evidence."},
  {t:"A good question",s:"",x:"A good question does not perform intelligence. | It makes thinking easier. | It removes one assumption, | names one uncertainty, | or gives the other person somewhere useful to begin. | The best questions leave a little space after them. | Do not fill that space. | Let the answer arrive."},
  {t:"The value of revision",s:"",x:"Most clear writing begins as unclear writing. | The same is true of speech. | Your first explanation shows you what you think. | Your second explanation shows another person. | Revision is not evidence that you failed. | It is the ordinary work | of making an idea fit through a doorway."},
  {t:"Attention",s:"",x:"Attention is a vote you cast with your day. | Every notification asks for one. | Every interruption spends one. | You do not need perfect discipline. | You need a few protected minutes | in which the important thing | is allowed to become difficult | before you abandon it."},
  {t:"A clear apology",s:"",x:"A useful apology has no maze in it. | Name what you did. | Name the cost of it. | Say what you will change. | Then stop asking the other person | to make you feel better. | Repair begins when the explanation ends | and the next action is visible."},
  {t:"Small improvements",s:"",x:"Improvement rarely arrives as a dramatic change. | It arrives as a better question, | a cleaner first draft, | or one fewer excuse at the end of the day. | Small gains are easy to dismiss | because they are easy to repeat. | That is precisely their strength."},
  {t:"The room",s:"",x:"Before you speak, | notice the room you are in. | Is it hurried, uncertain, tired, or curious? | The same sentence lands differently | in each of those rooms. | Good communication is not changing your point. | It is choosing the door | through which your point can enter."},
  {t:"Make the trade",s:"",x:"Every decision trades one good thing for another. | Speed trades against care. | Flexibility trades against certainty. | A mature answer does not pretend | the trade is absent. | It names the cost, | chooses it deliberately, | and takes responsibility for it."},
  {t:"Starting before ready",s:"",x:"You can prepare forever | and still feel unready. | At some point, preparation becomes a polite name for delay. | Begin with the smallest honest version. | Send the draft. | Ask the question. | Make the call. | Momentum is not confidence. | It is evidence that you moved."},
  {t:"What evidence does",s:"",x:"Evidence does not remove judgment. | It gives judgment something solid to stand on. | A number can be incomplete. | A story can be biased. | Together, they can still teach you more | than a strong opinion | repeated with confidence."},
  {t:"A calmer pace",s:"",x:"Speaking slowly is not the same as speaking vaguely. | A calm pace gives each idea | enough room to be heard. | It lets you choose the next word | instead of chasing the last one. | Slow down at the important point. | The listener will follow."}
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

READINGS.push(
  {t:"The next question",s:"",x:"When an answer is unclear, | do not make it louder. | Ask a better question. | A better question narrows the subject | without shrinking the person. | It says, | show me where this began, | tell me what changed, | help me see the part that matters."},
  {t:"Enough detail",s:"",x:"Details build trust, | but too many can bury the point. | Give the listener one fact they can picture, | one reason it matters, | and one next step. | If they need more, | they will ask. | Clarity is not withholding. | It is arranging."},
  {t:"The handover",s:"",x:"A good handover does not say, | everything is in the folder. | It says, | here is where we are, | here is what could go wrong, | and here is the first thing to do tomorrow. | The person receiving the work | should not have to reconstruct the story."},
  {t:"A useful boundary",s:"",x:"A boundary is not a punishment. | It is information about what you can sustain. | Say what you can do, | say what you cannot do, | and say it early enough | for the other person to plan. | Resentment often begins | where a boundary was never spoken."},
  {t:"Being specific",s:"",x:"Specific language is generous. | It saves people from guessing | what you meant, | what you need, | and what happens next. | Instead of saying soon, | name the day. | Instead of saying better, | name the difference. | Precision is a form of care."},
  {t:"The quiet signal",s:"",x:"Not every important signal is loud. | A customer who stops replying, | a teammate who asks fewer questions, | or a project that needs more reminders | may be telling you something early. | Notice the small change. | It is often easier to address | than the large failure that follows."},
  {t:"A fair summary",s:"",x:"Before you disagree, | try to state the other person's view | in a way they would recognize. | If they say yes, | you have earned the right to respond. | If they say no, | you have learned that the argument | was never about the thing you thought."},
  {t:"Useful uncertainty",s:"",x:"It is possible to be uncertain | without being unhelpful. | Say what you know, | say what you do not know, | and name the step that will reduce the gap. | People can work with uncertainty. | What they cannot work with | is a confident guess | wearing the clothes of fact."},
  {t:"The first draft",s:"",x:"The first draft has one job: | to exist. | Do not ask it to be elegant, | complete, | and unafraid at the same time. | Put the parts on the table. | Then return with better questions | and make the shape visible."},
  {t:"A slower answer",s:"",x:"Some questions deserve a pause | before they deserve an answer. | The pause is not weakness. | It is the moment you refuse | to trade accuracy for speed. | A careful answer may take longer, | but it saves everyone | from cleaning up a careless one later."}
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
const HARD = ["um","umm","uh","uhh","er","erm","ah","ahh","hmm","mmm","mm"];
const CRUTCH = ["like","you know","i mean","sort of","kind of","basically","actually",
  "literally","obviously","honestly","just","stuff","things","whatever","anyway",
  "right","okay so","and stuff","or something","pretty much","i guess","i think"];

const STOP = new Set(("the a an and or but if of to in on at for with as is are was were be been am "+
  "i you he she it we they me him her them my your his its our their this that these those there here "+
  "do does did have has had will would can could should not no yes so then than what which who whom "+
  "when where why how all any some very just more most other into over about from by up down out").split(" "));

/* ══ 2. STORAGE ══════════════════════════════════════════════════════ */

const KEY = "speakeasy.v1";
const store = {
  read(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {sessions:[],theme:null}; }
          catch(e){ return {sessions:[],theme:null}; } },
  write(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){} },
  add(s){ const d=this.read(); d.sessions.push(s); d.sessions=d.sessions.slice(-200); this.write(d); return d; },
  set(k,v){ const d=this.read(); d[k]=v; this.write(d); }
};

function dayKey(ts){ const d=new Date(ts); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function streak(sessions){
  if(!sessions.length) return 0;
  const days = new Set(sessions.map(s=>dayKey(s.at)));
  let n=0, cur=new Date();
  if(!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate()-1);  // today not done yet: streak still alive
  while(days.has(dayKey(cur.getTime()))){ n++; cur.setDate(cur.getDate()-1); }
  return n;
}

/* ══ 3. TEXT HELPERS ═════════════════════════════════════════════════ */

/* fold curly apostrophes to straight first: our copy is typeset with ’ but the
   speech recogniser returns ', and both must tokenise to the same word */
const norm = s => s.toLowerCase().replace(/[’ʼ´]/g,"'")
  .replace(/[^a-z0-9'\s]/g," ").replace(/\s+/g," ").trim();
const words = s => norm(s) ? norm(s).split(" ") : [];
/* Display tokens — the original text split on whitespace, punctuation intact.
   Word timings are indexed by THIS, not by words(), so the spans rendered for
   playback and the timestamps recorded during the session can never drift. */
const tokens = s => s.trim() ? s.trim().split(/\s+/) : [];

/* Recognition reports a word slightly after it was spoken, so highlighting at
   the raw stamp always runs late. Nudge the playhead forward by this much. */
const READ_LAG = 0.42;

/* Loudness as a score, from the raw RMS averaged over speech.
   The old version reused the drawing curve, which saturates at rms 0.13 — so
   every normal speaking voice pinned at the top, and anything louder scored
   WORSE than a mumble. Decibels are monotonic across the whole real range:
   -46 dB (barely audible) → 0, 0 dB (clipping) → 100. */
function projFromRms(meanRms){
  const db = 20 * Math.log10(Math.max(meanRms, 1e-5));
  return clamp(Math.round((db + 46) / 46 * 100), 0, 100);
}

/* Reading a set passage produces two different facts that must not be mixed:
     acc      — of the words you actually reached, how many came through
     coverage — how much of the passage you got to at all
   Dividing hits by the whole passage conflates them, so stopping early reads
   as catastrophically bad diction rather than as an unfinished passage. */
function readStats(spoken, target){
  const hit = matchTarget(spoken, target), n = hit.length;
  let last = -1;
  for(let i=0;i<n;i++) if(hit[i]) last = i;
  const covered = last + 1;
  if(!n || covered < 3) return { acc:0, coverage:0, covered:0, missed:n, hit };
  let good = 0;
  for(let i=0;i<covered;i++) if(hit[i]) good++;
  return { acc: Math.round(100*good/covered), coverage: Math.round(100*covered/n),
           covered, missed: covered - good, hit };
}

/* Which words of a set passage were actually recognised, in order?
   Returns one boolean per target token. A forward pointer with a short
   lookahead, so a dropped or inserted word costs you that word and not the
   rest of the line. The booth and the report both use this, so the marking
   you watched live is exactly the marking you get back afterwards. */
function matchTarget(spoken, target){
  const sp = words(spoken), tn = tokens(target).map(w => words(w)[0] || "");
  const hit = new Array(tn.length).fill(false);
  let p = 0;
  for(const s of sp){
    for(let k=p; k<Math.min(tn.length, p+5); k++){
      if(tn[k] === s){ hit[k] = true; p = k+1; break; }
    }
  }
  return hit;
}

/* Which word is being spoken at playback position `at`?
   times is non-decreasing, so the last stamp at or before the position wins.
   Returns -1 before the first word. */
function wordAt(times, at){
  const p = at + READ_LAG;
  let cur = -1;
  for(let i=0;i<times.length;i++){ if(times[i] <= p) cur = i; else break; }
  return cur;
}

function countFillers(text){
  const t = " " + norm(text) + " ";
  let hard=0, crutch=0; const found={};
  const tally = (list, isHard) => list.forEach(f=>{
    const m = t.match(new RegExp("(?<=\\s)"+f.replace(/ /g,"\\s+")+"(?=\\s)","g"));
    if(m){ found[f]=(found[f]||0)+m.length; if(isHard) hard+=m.length; else crutch+=m.length; }
  });
  try{ tally(HARD,true); tally(CRUTCH,false); }
  catch(e){                                    // Safari <16.4 has no lookbehind
    const ws = words(text);
    ws.forEach(w=>{ if(HARD.includes(w)){ hard++; found[w]=(found[w]||0)+1; }
                    else if(CRUTCH.includes(w)){ crutch++; found[w]=(found[w]||0)+1; } });
  }
  return {hard, crutch, total:hard+crutch, found};
}

/* longest common subsequence length — texts are short, O(n*m) is fine */
function lcs(a,b){
  const n=b.length; let prev=new Uint16Array(n+1), cur=new Uint16Array(n+1);
  for(let i=0;i<a.length;i++){
    for(let j=1;j<=n;j++) cur[j] = a[i]===b[j-1] ? prev[j-1]+1 : Math.max(prev[j],cur[j-1]);
    const t=prev; prev=cur; cur=t; cur.fill(0);
  }
  return prev[n];
}
function accuracy(spoken, target){
  const a=words(spoken), b=words(target);
  if(!b.length) return 0;
  return Math.round(100 * Math.min(1, lcs(a,b)/b.length));
}
function variety(text){
  const content = words(text).filter(w=>!STOP.has(w) && w.length>2);
  if(content.length < 12) return null;
  return Math.round(100 * new Set(content).size / content.length);
}
/* stems match so "reconciled" counts as "reconcile" */
function usedWord(text, target){
  const stem = target.slice(0, Math.max(4, target.length-3));
  return words(text).some(w => w.startsWith(stem));
}
const esc = s => String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

/* ══ 4. AUDIO ENGINE ═════════════════════════════════════════════════ */

const audio = {
  stream:null, ctx:null, analyser:null, data:null, freq:null, binHz:0,
  recorder:null, chunks:[], url:null,
  async open(){
    if(this.stream) return true;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:false }
    });
    this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;              // 23 Hz bins at 48k — enough to see the speech band
    this.analyser.smoothingTimeConstant = .2;
    this.analyser.minDecibels = -85;           // clamp near-silent bins to 0 so the ratio stays sharp
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
    this.data = new Uint8Array(this.analyser.fftSize);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.binHz = this.ctx.sampleRate / this.analyser.fftSize;
    return true;
  },
  /* One frame of measurement.
     rms   — raw loudness, the thing the noise floor is measured in
     level — 0..1 perceptual value, used for drawing only
     ratio — share of spectral energy sitting in the 200–3800 Hz speech band.
             Voices concentrate there; fans, hum and handling noise sit below it,
             hiss sits above. This is what separates "a room" from "a person". */
  probe(){
    if(!this.analyser) return {rms:0, level:0, ratio:0};
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for(let i=0;i<this.data.length;i++){ const v=(this.data[i]-128)/128; sum += v*v; }
    const rms = Math.sqrt(sum/this.data.length);

    this.analyser.getByteFrequencyData(this.freq);
    const lo = Math.max(1, Math.floor(200/this.binHz)), hi = Math.ceil(3800/this.binHz);
    let total = 0, band = 0;
    for(let i=1;i<this.freq.length;i++){
      const v = this.freq[i];
      total += v;
      if(i>=lo && i<=hi) band += v;
    }
    return { rms, level: Math.min(1, Math.pow(rms*7.5, .72)), ratio: total>0 ? band/total : 0 };
  },
  startRecording(){
    if(this.url){ URL.revokeObjectURL(this.url); this.url=null; }
    this.chunks=[];
    try{
      const mt = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
      this.recorder = new MediaRecorder(this.stream, mt?{mimeType:mt}:undefined);
      this.recorder.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.recorder.start(250);
    }catch(e){ this.recorder=null; }        // playback is a bonus, never a blocker
  },
  stopRecording(){
    return new Promise(res=>{
      if(!this.recorder || this.recorder.state==="inactive") return res(null);
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, {type:this.chunks[0]?.type||"audio/webm"});
        this.url = URL.createObjectURL(blob); res(this.url);
      };
      this.recorder.stop();
    });
  },
  close(){ if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); this.stream=null; }
           if(this.ctx){ this.ctx.close(); this.ctx=null; } }
};

/* ══ 4b. VOICE ACTIVITY DETECTION ════════════════════════════════════
   The old test was `level > 0.075` — a fixed threshold. In a room with a
   fan or traffic the ambient level sits above it permanently, so the app
   believed you never stopped talking and every pause measurement was wrong.

   Two gates now, both relative to the room rather than absolute:
     1. loudness above the measured noise floor, not above a constant
     2. spectral shape that looks like a voice, not like a room

   The floor is measured from your actual room during the countdown, then
   keeps adapting during the session (falls fast, rises very slowly) so an
   air conditioner switching on mid-session doesn't break it.            */

/* Pure decision for one frame — kept separate so it is testable. */
function isSpeechFrame(rms, ratio, floor, sens){
  const gate = floor * (3.2 / sens) + 0.006;   // headroom over the room, plus a mic-noise ceiling
  return rms > gate && ratio > 0.32;
}

function makeVAD(sens){
  return {
    sens: sens || 1,
    floor: 0.012,          // sane default until the room is measured
    calib: [],
    calibrated: false,
    speaking: false,
    aboveSince: 0,         // when the current run of speech-looking frames began
    lastVoiced: 0,         // last frame that genuinely looked like speech
    ON_MS: 60,             // must look like speech this long before we believe it
    HANG_MS: 220,          // ...and stay believed this long after, so plosives don't chop a word

    sample(rms){ if(this.calib.length < 400) this.calib.push(rms); },
    /* 75th percentile of the quiet room, so one cough during calibration
       doesn't poison the floor the way a max() would. */
    commit(){
      if(this.calib.length < 8) return false;
      const s = [...this.calib].sort((a,b)=>a-b);
      this.floor = Math.max(0.003, s[Math.floor(s.length*0.75)]);
      this.calib = []; this.calibrated = true;
      return true;
    },
    roomLevel(){ return Math.min(100, Math.round(this.floor * 900)); },

    step(rms, ratio, now){
      // adaptive floor: drop toward quiet quickly, creep up very slowly
      this.floor += (rms < this.floor ? 0.05 : 0.0004) * (rms - this.floor);
      if(this.floor < 0.002) this.floor = 0.002;

      const looks = isSpeechFrame(rms, ratio, this.floor, this.sens);
      if(looks){ this.lastVoiced = now; if(!this.aboveSince) this.aboveSince = now; }
      else this.aboveSince = 0;

      if(this.speaking) this.speaking = (now - this.lastVoiced) < this.HANG_MS;
      else this.speaking = looks && this.aboveSince && (now - this.aboveSince) >= this.ON_MS;
      return this.speaking;
    }
  };
}

/* ══ 5. SPEECH RECOGNITION ═══════════════════════════════════════════ */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const listener = {
  rec:null, want:false, final:"", interim:"", onUpdate:null, onError:null,
  supported: !!SR,
  err: null, netFails: 0, gotAny: false, live: false, onStatus: null, lastSpin: 0,
  /* en-US mangles other English accents badly. Follow the browser when it is
     already set to some English; the drills are English-only, so anything else
     falls back rather than transcribing English with a foreign model. */
  lang: /^en\b/i.test(navigator.language || "") ? navigator.language : "en-US",
  start(){
    if(!SR) return false;
    this.want = true; this.final = ""; this.interim = "";
    this.err = null; this.netFails = 0; this.gotAny = false;
    this._spin();
    return true;
  },
  _spin(){
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = this.lang; r.maxAlternatives = 1;
    this.lastSpin = Date.now();
    /* How many results of THIS session are already folded into final. Chrome
       re-fires results it has already marked final (after a network blip, or
       when it revises an earlier utterance), and resultIndex points back at
       them — appending blind is what duplicates phrases in the transcript. */
    let done = 0;
    r.onstart = () => { this.live = true; this.err = null; this.onStatus && this.onStatus(); };
    r.onresult = e => {
      let iv = "";
      for(let i=Math.max(e.resultIndex, done); i<e.results.length; i++){
        const txt = e.results[i][0].transcript;
        if(e.results[i].isFinal){ this.final += txt + " "; done = i + 1; } else iv += txt;
      }
      this.interim = iv;
      this.gotAny = true; this.err = null; this.netFails = 0;
      this.onUpdate && this.onUpdate(this.final, this.interim);
      this.onStatus && this.onStatus();
    };
    r.onerror = e => {
      // no-speech and aborted are normal between utterances — recording them as
      // errors makes a finished run report a fault that never happened
      if(e.error === "no-speech" || e.error === "aborted"){ this.onStatus && this.onStatus(); return; }
      this.err = e.error;
      // fatal: retrying will never help, so stop and say why
      if(e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture"){
        this.want = false; this.onError && this.onError(e.error);
      }
      // network can be a blip, but a persistent one used to retry forever in silence
      else if(e.error === "network" && ++this.netFails >= 3){
        this.want = false; this.onError && this.onError("network");
      }
      this.onStatus && this.onStatus();
    };
    r.onend = () => {
      this.live = false;
      /* Chrome ends a session on its own — a silence gap, or its own ~1 minute
         cap — and throws away whatever was still interim. That is the "words
         just vanish mid-sentence" case: keep the tail instead of dropping it. */
      if(this.interim){ this.final += this.interim + " "; this.interim = ""; }
      if(this.want) this._restart();
    };
    this.rec = r;
    /* start() throws if the previous session hasn't released the mic yet. The
       old code swallowed that: no session, no onend, nothing left to retry, and
       transcription was dead for the rest of the run while the chip said "on". */
    try{ r.start(); }
    catch(e){ setTimeout(() => { if(this.want) this._spin(); }, 250); }
  },
  /* Restart at once so the gap between sessions swallows as little speech as
     possible — but back off if the session died instantly, or a mic that never
     opens turns this into a spin loop. */
  _restart(){
    const quick = Date.now() - this.lastSpin < 500;
    if(quick) setTimeout(() => { if(this.want) this._spin(); }, 300);
    else this._spin();
  },
  stop(){ this.want = false; this.live = false; try{ this.rec && this.rec.stop(); }catch(e){} },
  text(){ return (this.final + " " + this.interim).trim(); }
};

/* Brave removes the Google speech keys, so its failure mode is a network error
   that no amount of connection-checking will fix. Detect it and say so instead
   of sending people to debug their wifi. The check is async, so it resolves in
   the background and only sharpens the message once known. */
let isBrave = false;
if(navigator.brave && navigator.brave.isBrave)
  navigator.brave.isBrave().then(v => { isBrave = !!v; }).catch(()=>{});

/* Why transcription isn't working, in terms someone can act on. */
function asrProblem(code){
  if(code === "not-allowed" || code === "service-not-allowed") return {
    t: "Transcription was blocked",
    d: "The browser refused speech recognition. Click the padlock in the address bar and allow microphone access, then start the drill again." };
  if(code === "audio-capture") return {
    t: "The microphone is busy",
    d: "Something else is holding the mic — another tab, a call app, or a recorder. Close it and start again." };
  if(code === "network") return isBrave ? {
    t: "Brave doesn't support transcription",
    d: "Speech recognition uploads audio to Google, so Brave ships without the keys for it and always reports a network error. This is deliberate on Brave's part and there's no setting to change it. Use Chrome or Edge for word-level feedback — every other measurement here works fine in Brave." } : {
    t: "Transcription can't reach its service",
    d: "The recogniser uploads audio to Google to transcribe it, so this one feature needs a working connection to Google — everything else here is local. Check any VPN, proxy, or privacy extension, and try an Incognito window with extensions off." };
  return {
    t: "Transcription isn't running",
    d: "Speech recognition is available in Chrome and Edge. Firefox, Safari and Brave either don't ship it or block it by default — the timer, level meter and recording still work." };
}

/* ══ 6. DRILLS ═══════════════════════════════════════════════════════ */

const pick = a => a[Math.floor(Math.random()*a.length)];
const T = "var(--tungsten)", M = "var(--meter)", L = "var(--live)";

const DRILLS = [
  { id:"impromptu", name:"Impromptu", accent:T, dur:90, prep:15, tag:"Structure",
    icon:"M13 2 4 14h6l-1 8 9-12h-6z",
    desc:"A prompt you’ve never seen, a framework to hang it on, and ninety seconds. The rail tells you which part you should be on.",
    hint:"Read the prompt. Pick your last sentence before you start." },

  { id:"filler", name:"Filler Hunt", accent:L, dur:60, prep:5, tag:"Fluency",
    icon:"M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    desc:"Talk for a minute on any topic. Every um, uh, like or basically lights up the moment it lands. Target: zero.",
    hint:"When you feel a filler coming, close your mouth instead. Silence is free." },

  { id:"pace", name:"Pace & Pause", accent:M, dur:0, prep:5, tag:"Delivery",
    icon:"M12 20a8 8 0 1 1 8-8M12 12l5-3",
    desc:"Read a passage aloud inside a 130–170 word-per-minute band. Amber marks are breath points — hold each one for a full beat.",
    hint:"The marks aren’t decoration. Stop completely at each one." },

  { id:"diction", name:"Diction Gym", accent:T, dur:0, prep:3, tag:"Clarity",
    icon:"M4 12h2l2-6 3 14 3-11 2 5h4",
    desc:"Tongue twisters, scored by whether the recogniser actually understood you. Sloppy consonants show up as red words.",
    hint:"Slow and perfect beats fast and mangled. Speed comes after accuracy." },

  { id:"word", name:"Word Forge", accent:M, dur:35, prep:10, tag:"Vocabulary",
    icon:"M12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
    desc:"One precise word, one definition. Build a real sentence around it out loud — the drill checks you actually used it.",
    hint:"Don’t define the word. Use it, in a sentence about your own life." },

  { id:"echo", name:"Echo", accent:L, dur:0, prep:2, tag:"Cadence",
    icon:"M8 8a5 5 0 0 1 0 8M11.5 5a9 9 0 0 1 0 14M5 11v2",
    desc:"A well-shaped sentence is read to you. Repeat it back with the same rhythm and stress. Scored on accuracy.",
    hint:"Copy the melody, not just the words. Where did the voice rise and fall?" }
];
const drillById = id => DRILLS.find(d=>d.id===id);

/* Build the stage for one run. Returns {html, target, rail, dur, speak} */
function buildRun(id){
  if(id==="impromptu"){
    const p = pick(PROMPTS), f = pick(FRAMEWORKS);
    return { dur:90, target:null, framework:f,
      html:`<div class="kick eyebrow">Impromptu · ${esc(f.name)}</div>
            <div class="big">${esc(p)}</div>
            <div class="def">${esc(f.why)}</div>
            <div class="rail">${f.steps.map((s,i)=>
              `<div class="step" data-i="${i}"><div class="sn">${String(i+1).padStart(2,"0")}</div>
               <div class="st">${esc(s.t)}</div><div class="sh">${esc(s.h)}</div></div>`).join("")}</div>`,
      cd:`${p}` };
  }
  if(id==="filler"){
    const p = pick(PROMPTS);
    return { dur:60, target:null,
      html:`<div class="kick eyebrow">Filler Hunt · 60 seconds · target zero</div>
            <div class="big">${esc(p)}</div>
            <div class="def">Any topic works — this one is just to stop you stalling. The score is the fillers, not the content.</div>`,
      cd:p };
  }
  if(id==="pace"){
    const r = pick(READINGS);
    const target = r.x.replace(/\|/g," ");
    const html = r.x.split("|").map(seg =>
      seg.trim().split(/\s+/).filter(Boolean).map(w=>`<w>${esc(w)}</w>`).join(" ")
    ).join(' <span class="brk">‖</span> ');
    return { dur: Math.max(45, Math.round(words(target).length/2.5)), target,
      display: r.x,                       // keeps the "|" breath marks for the report
      html:`<div class="kick eyebrow">Read aloud${r.s?" · "+esc(r.s):""}</div>
            <div class="read">${html}</div>`,
      cd:r.t };
  }
  if(id==="diction"){
    const t = pick(TWISTERS);
    const target = (t.x+" ").repeat(3).trim();
    return { dur:30, target,
      html:`<div class="kick eyebrow">Diction · ${esc(t.f)} · three times through</div>
            <div class="read">${target.split(" ").map(w=>`<w>${esc(w)}</w>`).join(" ")}</div>
            <div class="def">Say it three times without a stumble. Red words are ones the recogniser couldn’t make out.</div>`,
      cd:t.x };
  }
  if(id==="word"){
    const w = pick(WORDS);
    return { dur:35, target:null, requireWord:w.w,
      html:`<div class="kick eyebrow">Word Forge</div>
            <div class="big">${esc(w.w)}</div>
            <div class="def">${esc(w.d)}<br><i>e.g. &ldquo;${esc(w.e)}&rdquo;</i></div>`,
      cd:`${w.w} — ${w.d}` };
  }
  const line = pick(ECHOES);
  return { dur:22, target:line, speak:line,
    html:`<div class="kick eyebrow">Echo · listen, then repeat</div>
          <div class="read">${line.split(" ").map(w=>`<w>${esc(w)}</w>`).join(" ")}</div>
          <div class="def">Match the rhythm and the stress, not just the words.</div>`,
    cd:"Listen first" };
}

/* ══ 6a. LOCAL LANGUAGE ANALYSIS ═════════════════════════════════════
   Deterministic, offline, instant, and in every browser. Not a model —
   it looks for specific habits that weaken spoken English and quotes your
   own words back. This is the floor: whatever else is available, this runs.  */

const HEDGE = ["i think","i guess","i suppose","maybe","perhaps","probably","sort of","kind of",
  "a bit","a little","i feel like","i would say","more or less","or something","i mean",
  "not sure","might be","could be","in my opinion","to be honest"];
const VAGUE = ["thing","things","stuff","something","someone","somebody","somewhere","anything",
  "everything","a lot","lots","some","various","certain","whatever"];
const INTENSIFIER = ["very","really","so","super","extremely","incredibly","totally","completely",
  "absolutely","quite","pretty","actually","literally","definitely","obviously"];

const countPhrases = (text, list) => {
  const t = " " + norm(text) + " ";
  const found = {};
  list.forEach(p => {
    // word-boundary safe without lookbehind: pad and match with spaces
    let i = 0, n = 0, needle = " " + p + " ";
    while((i = t.indexOf(needle, i)) !== -1){ n++; i += needle.length - 1; }
    if(n) found[p] = n;
  });
  return found;
};
const totalOf = o => Object.values(o).reduce((a,b)=>a+b, 0);
const topOf = (o, k) => Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0, k||3).map(e=>e[0]);

/* Findings are ordered by how much they cost you, worst first. */
function analyseLanguage(text, opts){
  opts = opts || {};
  const ws = words(text), n = ws.length;
  const out = [];
  if(n < 12) return out;                       // too little to say anything honest about
  // floor the denominator and require more than one occurrence: in a 30-word
  // answer a single "someone" would otherwise cross a per-100 threshold and
  // get reported as a habit, which it isn't
  const per100 = c => (c / Math.max(n, 50)) * 100;
  const push = (id, weight, title, detail) => out.push({ id, weight, title, detail });

  const hedges = countPhrases(text, HEDGE), hCount = totalOf(hedges);
  if(hCount >= 2 && per100(hCount) >= 2.2)
    push("hedge", per100(hCount), "You are hedging",
      `${hCount} hedging phrase${hCount>1?"s":""} — ${topOf(hedges).map(w=>`“${w}”`).join(", ")}. ` +
      `Each one quietly tells the listener not to fully believe you. Say the claim, then defend it if challenged.`);

  const vague = countPhrases(text, VAGUE), vCount = totalOf(vague);
  if(vCount >= 2 && per100(vCount) >= 3)
    push("vague", per100(vCount), "Too many placeholder words",
      `${vCount} vague word${vCount>1?"s":""} — ${topOf(vague).map(w=>`“${w}”`).join(", ")}. ` +
      `Every one is a slot where a specific noun would have been stronger.`);

  const ints = countPhrases(text, INTENSIFIER), iCount = totalOf(ints);
  if(iCount >= 2 && per100(iCount) >= 3.5)
    push("intense", per100(iCount) * .8, "Intensifiers are doing the work",
      `${iCount} of them — ${topOf(ints).map(w=>`“${w}”`).join(", ")}. ` +
      `“Very important” is weaker than “essential”. Pick the stronger word instead of propping up a weak one.`);

  // a content word leaned on far more than the rest
  const content = ws.filter(w => !STOP.has(w) && w.length > 3);
  if(content.length >= 15){
    const freq = {};
    content.forEach(w => freq[w] = (freq[w]||0) + 1);
    const [word, count] = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
    if(count >= 4 && count/content.length >= 0.05)
      push("repeat", count * 1.6, "One word is carrying too much",
        `You said “${word}” ${count} times. Reaching for a synonym forces a sharper thought, ` +
        `not just a different sound.`);
  }

  // starting clause after clause the same way
  const openers = {};
  ws.forEach((w, i) => { if(i === 0 || ["and","but","so","then","because"].includes(ws[i-1])) openers[w] = (openers[w]||0)+1; });
  const topOpen = Object.entries(openers).sort((a,b)=>b[1]-a[1])[0];
  if(topOpen && topOpen[1] >= 4)
    push("opener", topOpen[1], "Your clauses all start the same way",
      `${topOpen[1]} of them begin with “${topOpen[0]}”. Vary the entry point and the whole answer stops sounding like a list.`);

  // opened on a hedge instead of a position
  const first = ws.slice(0, 6).join(" ");
  if(HEDGE.some(h => first.includes(h)) || HARD.includes(ws[0]))
    push("open", 6, "Weak opening",
      `You started with “${ws.slice(0, 5).join(" ")}…”. The first sentence is the one they remember — ` +
      `lead with the position and put the caveat after it.`);

  // frameworks ask for a reason and an example; both leave linguistic traces
  if(opts.framework){
    const t = " " + norm(text) + " ";
    if(!/(^| )(because|since|the reason|that is why|which is why)( |$)/.test(t))
      push("reason", 5, "No reason given",
        `The ${opts.framework} shape asks you to say why. Nothing in this answer signals a reason — ` +
        `one “because” changes an assertion into an argument.`);
    if(!/(^| )(for example|for instance|such as|like when|once |last week|last year)( |$)/.test(t))
      push("example", 5.5, "No concrete example",
        `Nothing here points at a specific occasion. One real example is worth three more sentences of theory.`);
  }

  return out.sort((a,b) => b.weight - a.weight);
}

/* ══ 6b. THE DAILY SESSION ══════════════════════════════════════════
   Landing on six drills and having to choose is where a daily habit dies.
   A plan is three drills picked from your own weakest metrics, so the
   decision is already made and the practice is aimed at what is worst.  */

/* Which drill trains which weakness. Several metrics point at the same drill,
   which is fine — the plan takes the first three DISTINCT drills. */
const METRIC_DRILL = {
  filler: "filler",    // um, uh, crutch words
  pace:   "pace",      // too fast or too slow
  pause:  "pace",      // not pausing deliberately
  acc:    "diction",   // consonants not landing
  cover:  "diction",   // not getting through the text
  var:    "word",      // recycling the same words
  proj:   "echo"       // under-projecting, flat delivery
};
const METRIC_NAME = {
  filler:"fillers", pace:"pace", pause:"pausing", acc:"diction",
  cover:"reading through", var:"word variety", proj:"projection"
};

/* Average each component over recent sessions. Older sessions have no `parts`,
   so they are simply skipped rather than treated as zeros. */
function metricAverages(sessions, window){
  const sum = {}, n = {};
  sessions.slice(-(window || 10)).forEach(s => {
    if(!s.parts) return;
    for(const k in s.parts){
      if(typeof s.parts[k] !== "number") continue;
      sum[k] = (sum[k] || 0) + s.parts[k]; n[k] = (n[k] || 0) + 1;
    }
  });
  const out = {};
  for(const k in sum) out[k] = Math.round(sum[k]/n[k]);
  return out;
}

/* Three drills, worst weakness first. Falls back to the least-practised drills
   when there is not enough history to know what is weak yet. */
function buildPlan(sessions, size){
  size = size || 3;
  const avg = metricAverages(sessions);
  const ranked = Object.keys(avg).sort((a,b) => avg[a] - avg[b]);
  const drills = [], why = {};
  for(const k of ranked){
    const d = METRIC_DRILL[k];
    if(!d || drills.includes(d)) continue;
    drills.push(d); why[d] = { metric:k, score:avg[k] };
    if(drills.length === size) break;
  }
  if(drills.length < size){
    // not enough data: favour whatever has been practised least
    const count = {};
    DRILLS.forEach(d => count[d.id] = 0);
    sessions.forEach(s => { if(count[s.drill] != null) count[s.drill]++; });
    DRILLS.slice().sort((a,b) => count[a.id] - count[b.id]).forEach(d => {
      if(drills.length < size && !drills.includes(d.id)) drills.push(d.id);
    });
  }
  return { drills, why };
}

/* Per-metric trend. One composite score can't tell you that your pace is
   improving while your fillers are not — which is exactly the thing worth
   knowing. Compares the recent half of a series against the earlier half. */
function trendFor(sessions, key){
  const v = sessions.filter(s => s.parts && typeof s.parts[key] === "number")
                    .map(s => s.parts[key]);
  if(v.length < 3) return null;                 // too few points to claim a direction
  const half = Math.floor(v.length/2);
  const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
  return { values:v, now:v[v.length-1], n:v.length,
           delta: Math.round(mean(v.slice(half)) - mean(v.slice(0, half))) };
}

const todayKey = () => dayKey(Date.now());

/* The plan is regenerated once a day and remembers what you have finished. */
function readPlan(){
  const d = store.read(), p = d.plan;
  if(p && p.day === todayKey()) return p;
  const built = buildPlan(d.sessions || []);
  const fresh = { day: todayKey(), drills: built.drills, why: built.why, done: [] };
  store.set("plan", fresh);
  return fresh;
}
function markPlanDone(drill){
  const p = readPlan();
  if(p.drills.includes(drill) && !p.done.includes(drill)){
    p.done = p.done.concat(drill);
    store.set("plan", p);
  }
  return p;
}
const nextInPlan = p => p.drills.find(d => !p.done.includes(d)) || null;

/* ══ 7. SCORING ══════════════════════════════════════════════════════ */

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const band = (v,lo,hi,fall)=> v>=lo&&v<=hi ? 100 : clamp(100 - (v<lo?lo-v:v-hi)*fall, 0, 100);
/* Linear 0→100 between two points, for metrics that are simply better when
   higher. Unlike band() it has no plateau, so improvement always shows. */
const ramp = (v,zero,full)=> clamp((v-zero)/(full-zero)*100, 0, 100);

/* Fillers per 100 words. Counting them absolutely made two "um"s in a 40-word
   answer score the same as two in a 300-word answer, which is backwards — the
   first is a stammer, the second is fluent. Hard fillers weigh double.
   Reading a set passage: its crutch words are the author's, so they don't count. */
function fillerRate(m, reading){
  // floor the denominator: a rate taken over 20 words is sampling noise, and
  // one slip in a short answer shouldn't read as a catastrophe
  const w = Math.max(m.words || 0, 50);
  return (m.f.hard*2 + (reading ? 0 : m.f.crutch)) / w * 100;
}

function scoreRun(m, run, id){
  const parts = [];
  const add = (k,label,v,w) => { if(v!=null) parts.push({k,label,v:Math.round(v),w}); };
  const reading = !!(run && run.target);

  // 138–165 wpm is the band broadcasters aim for; outside it, degrade steadily
  add("pace","Pace", m.wpm ? band(m.wpm,138,165,1.6) : null, id==="pace"?1.4:1);
  // ~1 per 100 words is a strong speaker, ~5 is average, 10+ is distracting
  add("filler","Fillers", m.wpm==null ? null :
      clamp(100 - fillerRate(m, reading)*9, 0, 100), id==="filler"?2.4:1);
  // 55–78 on the dB scale is roughly rms .10–.30: carrying, without clipping
  add("proj","Projection", band(m.proj,55,78,2.2), .8);
  // ASR is never perfect, so 96% counts as full marks rather than 100%
  if(m.acc!=null)  add("acc","Diction", ramp(m.acc,50,96), 2);
  if(m.coverage!=null) add("cover","Passage read", ramp(m.coverage,30,98), 1);
  if(m.var!=null)  add("var","Word variety", band(m.var,68,100,2.2), .7);
  if(m.pauseScore!=null) add("pause","Pausing", m.pauseScore, id==="pace"?1.3:.7);

  const tw = parts.reduce((s,p)=>s+p.w,0) || 1;
  return { score: Math.round(parts.reduce((s,p)=>s+p.v*p.w,0)/tw), parts };
}

function verdict(score){
  if(score>=90) return ["Sharp.","That was clean, paced and structured. Raise the difficulty — shorter prep, harder prompt."];
  if(score>=76) return ["Solid.","Clearly above average delivery. The gap to excellent is in the details below."];
  if(score>=62) return ["Getting there.","The shape is right. Pick the single lowest number below and only work on that this week."];
  if(score>=45) return ["Rough, and that’s fine.","Everyone sounds like this at the start. Run the same drill three days in a row before you judge it."];
  return ["Early days.","Nothing here is a verdict on you. It’s a baseline. The second run is almost always better than the first."];
}

function coachNotes(m, run, id, S){
  const n = [];
  if(m.f.hard >= 3) n.push(["Fillers are your loudest tell.",
    `You landed ${m.f.hard} hard filler${m.f.hard>1?"s":""} (um, uh, er). Next run, when one starts to form, shut your mouth and count one beat. It will feel like an eternity and sound like composure.`]);
  if(m.f.crutch >= 5 && !(run && run.target)) n.push(["Crutch words are padding the sentences.",
    `${m.f.crutch} uses of ${Object.keys(m.f.found).filter(k=>CRUTCH.includes(k)).slice(0,3).join(", ")||"like / basically / actually"}. They’re not wrong, they’re just load-bearing for nothing. Cut them and the sentence stands anyway.`]);
  if(m.wpm && m.wpm > 180) n.push(["You’re outrunning the listener.",
    `${m.wpm} wpm. Above about 175 the audience stops processing and starts just hearing. Put a full stop where you’d normally put a comma.`]);
  if(m.wpm && m.wpm < 115) n.push(["Too slow to hold attention.",
    `${m.wpm} wpm. This usually means you’re composing the sentence while saying it. Decide the whole sentence, then deliver it at speed.`]);
  if(m.proj < 45) n.push(["You’re under-projecting.",
    `Your voice averaged ${m.proj}/100${m.snr!=null ? `, sitting only ${m.snr} dB above the room` : ""}. Not volume — support. Breathe from lower down and aim at the far wall, not the screen.`]);
  if(m.proj > 88) n.push(["You’re close to clipping.",
    "The signal is nearly at the top of what the microphone can take, which distorts consonants and makes you harder to understand, not easier. Sit back a few inches rather than speaking more quietly."]);
  if(m.coverage != null && m.coverage < 70) n.push(["You didn’t reach the end of the passage.",
    `You got through ${m.coverage}% of it. That is not a diction problem — accuracy is scored only on the words you actually reached — but the passage is built to be finished. Read a little faster, or run a longer session.`]);
  if(m.room != null && m.room >= 34) n.push(["Your room is working against you.",
    `Background noise measured ${m.room}/100. The detector has to raise its threshold above that, so quiet passages may not register as speech at all. A quieter room will move these numbers more than any drill will.`]);
  if(m.acc != null && m.acc < 78) n.push(["Consonants are getting swallowed.",
    `Of the words you reached, ${m.acc}% came through. The ends of words are usually the first casualty. Over-articulate the final consonant for a week.`]);
  if(m.var != null && m.var < 48) n.push(["You’re recycling the same words.",
    `${m.var}% of your content words were unique. Not a vocabulary problem — a reaching problem. Try Word Forge before your next impromptu.`]);
  if(m.longPause > 4.5) n.push(["One pause ran too long.",
    `Longest gap was ${m.longPause.toFixed(1)}s. Under two seconds reads as thought; over four reads as lost. If you need longer, say "let me think about that" out loud.`]);
  if(run.requireWord && !m.usedWord) n.push(["The target word never appeared.",
    `You didn’t use "${run.requireWord}". Building the sentence around the word is the whole exercise — the definition is just the starting point.`]);
  if(m.goodPauses >= 3 && m.f.hard === 0) n.push(["You paused instead of stalling.",
    `${m.goodPauses} deliberate pauses and zero hard fillers. This is exactly the trade you want. Keep it.`]);
  if(!n.length) n.push(["Nothing obvious to fix.",
    "No single metric is dragging. Make it harder: cut the prep time in half, or take a prompt you actively don’t want."]);
  return n.slice(0,4);
}

/* ══ 8. CANVAS ═══════════════════════════════════════════════════════ */

function fit(cv){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  }
  const c = cv.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,w,h);
  return {c,w,h};
}
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* home: a drifting pseudo-speech envelope, drawn in the same bars as the tape
   so the hero is a preview of what a session actually produces */
let idleT = 0;
function drawIdle(){
  const cv = document.getElementById("idleWave"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, step = 4;
  idleT += 0.009;
  c.fillStyle = css("--tungsten");
  for(let x=0; x<w; x+=step){
    const p = x/w;
    // three incommensurate rates: syllables, words, phrases
    const v = Math.abs(Math.sin(p*27 + idleT*3.1))
            * (0.42 + 0.58*Math.abs(Math.sin(p*8.5 - idleT*1.7)))
            * (0.30 + 0.70*Math.abs(Math.sin(p*2.9 + idleT*0.6)))
            * Math.sin(p*Math.PI);                    // fade in and out at the edges
    const bh = Math.max(1, v*(h*0.46));
    c.globalAlpha = 0.45 + v*0.55;
    c.fillRect(x, mid-bh, step-1.5, bh*2);
  }
  c.globalAlpha = 1;
}

/* booth: scrolling live level, last ~9 seconds */
function drawRibbon(buf, bufV, flashUntil){
  const cv = document.getElementById("ribbon"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, n = buf.length, step = 2.5;
  const cols = Math.floor(w/step);
  c.strokeStyle = css("--edge-soft"); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0,mid+.5); c.lineTo(w,mid+.5); c.stroke();
  const hot = performance.now() < flashUntil;
  const voice = hot ? css("--live") : css("--tungsten"), room = css("--faint");
  for(let i=0;i<cols;i++){
    const k = n-cols+i, v = buf[k]; if(v===undefined) continue;
    const speech = bufV && bufV[k];
    // room tone stays short, dim and grey — only your voice gets height and colour
    const bh = Math.max(1, (speech ? v : Math.min(v,.14)) * (h*.42));
    c.fillStyle = speech ? voice : room;
    c.globalAlpha = speech ? .62 + v*.38 : .45;
    c.fillRect(i*step, mid-bh, step-1.2, bh*2);
  }
  c.globalAlpha = 1;
}

/* report: the tape — the whole session as one object you can scrub */
function drawTape(sess){
  const cv = document.getElementById("tape"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, n = sess.tape.length;
  if(!n) return;
  c.strokeStyle = css("--edge-soft"); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0,mid+.5); c.lineTo(w,mid+.5); c.stroke();

  const step = 3, cols = Math.floor(w/step), per = n/cols;
  const voice = css("--tungsten"), room = css("--faint"), tv = sess.tapeV || [];
  for(let i=0;i<cols;i++){
    let v=0, spoke=0, a=Math.floor(i*per), b=Math.max(a+1,Math.floor((i+1)*per));
    for(let k=a;k<b && k<n;k++){ v = Math.max(v, sess.tape[k]); if(tv[k]) spoke = 1; }
    // a column counts as voice only if some frame in it was speech
    const bh = Math.max(1, (spoke ? v : Math.min(v,.14)) * (h*.40));
    c.fillStyle = spoke ? voice : room;
    c.globalAlpha = spoke ? .5 + v*.5 : .45;
    c.fillRect(i*step, mid-bh, step-1.2, bh*2);
  }
  c.globalAlpha = 1;
  const X = t => (t/sess.elapsed) * w;
  sess.marks.forEach(m=>{
    const x = X(m.t);
    if(m.type==="filler"){
      c.fillStyle = css("--live"); c.fillRect(x-1, 2, 2, h-4);
      c.beginPath(); c.arc(x, 6, 3, 0, 7); c.fill();
    }else{
      c.fillStyle = css("--meter"); c.fillRect(x-1, h-9, 2, 7);
    }
  });
  if(sess.playhead != null){
    c.fillStyle = css("--chalk"); c.fillRect(X(sess.playhead)-.5, 0, 1.5, h);
  }
}

/* home: clarity over the last 30 sessions */
function drawHistory(sessions){
  const cv = document.getElementById("history"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv);
  const d = sessions.slice(-30);
  document.getElementById("histL").textContent =
    d.length ? d.length + (d.length===1?" session":" sessions") : "No sessions yet";
  if(!d.length){
    c.strokeStyle = css("--edge"); c.setLineDash([3,5]); c.lineWidth=1;
    c.beginPath(); c.moveTo(0,h-1); c.lineTo(w,h-1); c.stroke(); c.setLineDash([]);
    return;
  }
  const bw = Math.min(26, w/Math.max(d.length,8)), gap = Math.max(2, bw*.22);
  const step = w/d.length;
  d.forEach((s,i)=>{
    const bh = Math.max(3, (s.score/100)*(h-16));
    const x = i*step + (step-bw+gap)/2;
    c.fillStyle = s.score>=76 ? css("--meter") : s.score>=55 ? css("--tungsten") : css("--live");
    c.globalAlpha = .35 + (i/d.length)*.65;
    const r = Math.min(3, bw/3);
    c.beginPath();
    if(c.roundRect) c.roundRect(x, h-bh, bw-gap, bh, [r,r,0,0]); else c.rect(x, h-bh, bw-gap, bh);
    c.fill();
  });
  c.globalAlpha = 1;
  const avg = d.reduce((s,x)=>s+x.score,0)/d.length;
  const y = h-16 - (avg/100)*(h-16) + 16;
  c.strokeStyle = css("--dust"); c.globalAlpha=.5; c.setLineDash([2,4]);
  c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
}

/* ══ 9. SESSION RUNTIME ══════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const S = {
  drill:null, run:null, running:false, t0:0, elapsed:0, dur:0,
  tape:[], tapeV:[], marks:[], buf:[], bufV:[], lastSample:0, raf:0,
  vad:makeVAD(1), roomFrames:0, noiseFrames:0, wordTimes:[],
  voiced:false, silentSince:0, speakTime:0, lastFrame:0,
  levelSum:0, levelN:0, rmsSum:0, rmsN:0, goodPauses:0, longPause:0,
  flashUntil:0, lastFillers:0, wEls:[], coachAt:0, playhead:null, audioURL:null,
  /* Room calibration and the countdown run before the clock starts, so S.running
     is still false through all of it. Everything else guards on S.running, which
     left the whole prep phase wide open. */
  arming:false, cdIv:null, cdDone:null, cdToken:0
};

/* The countdown is a modal, so nothing behind it should be reachable. aria-modal
   is only a hint to screen readers — it doesn't stop a tab key or a click, which
   is how Exit got pressed underneath and stranded the countdown over the home
   screen. inert is the attribute that actually does it. */
function cdShow(){
  $("countdown").classList.add("on");
  [...document.body.children].forEach(el =>
    el.id !== "countdown" && el.toggleAttribute("inert", true));
}
function cdHide(){
  $("countdown").classList.remove("on");
  [...document.body.children].forEach(el => el.removeAttribute("inert"));
}

/* Abandon a run that hasn't started yet: stop the timers, drop the overlay, and
   release whoever is awaiting the countdown so begin() can bail before start(). */
function armCancel(){
  if(!S.arming) return;
  S.arming = false;
  S.cdToken++;                       // orphan any timer or speech callback still pending
  clearInterval(S.cdIv); S.cdIv = null;
  try{ speechSynthesis.cancel(); }catch(e){}
  cdHide();
  const done = S.cdDone; S.cdDone = null;
  done && done();
}

/* A report can keep playing after its view is hidden, so every view change
   explicitly stops it rather than relying on the browser to pause hidden media. */
function stopPlayback(){
  const playback = $("playback");
  if(!playback) return;
  playback.pause();
  playback.currentTime = 0;
}

function view(name){
  stopPlayback();
  ["practice","progress","guide","booth","report"].forEach(v=>$("v-"+v).classList.toggle("on", v===name));
  const isHome = name === "practice";
  document.querySelector(".layout").classList.toggle("is-home", isHome);
  document.querySelectorAll("[data-nav]").forEach(link => {
    const current = link.dataset.nav === name;
    link.toggleAttribute("aria-current", current);
    if(current) link.setAttribute("aria-current", "page");
  });
  if(matchMedia("(max-width: 940px)").matches) closeMenu();
  window.scrollTo({top:0, behavior:"instant"});
}

function newRun(id){
  S.drill = drillById(id);
  S.run = buildRun(id);
  S.dur = S.run.dur;
  $("boothName").textContent = S.drill.name;
  $("promptBox").innerHTML = S.run.html;
  S.wEls = [...$("promptBox").querySelectorAll("w")];
  S.wEls.forEach(el => el._n = words(el.textContent)[0] || "");
  $("liveText").innerHTML = "";
  $("clock").textContent = fmt(S.dur);
  $("clock").classList.remove("warn");
  $("setupRow").style.display = "";
  $("goBtn").textContent = id==="echo" ? "Listen, then speak" : "Start speaking";
  $("goBtn").className = "btn primary";
  $("coach").className = "";
  $("coach").innerHTML = `<b>${esc(S.drill.hint)}</b>`;
  $("ribbonHint").style.display = "";
  ["pace","fill","proj","extra"].forEach(k=>{
    $("b-"+k).style.width = "0%"; $("m-"+k).className = "mtr";
  });
  $("v-pace").innerHTML = "—<small>wpm</small>"; $("v-fill").textContent = "0";
  $("v-proj").textContent = "—"; $("v-extra").textContent = "0";
  $("l-extra").textContent = id==="pace"||id==="diction"||id==="echo" ? "Accuracy" : "Pauses";
  S.tape=[]; S.tapeV=[]; S.marks=[]; S.buf=[]; S.bufV=[]; S.playhead=null;
  S.roomFrames=0; S.noiseFrames=0; S.wordTimes=[];
  buildSetup();
  updateAsrChip();
  // say up front if word-level feedback won't be available this session
  $("boothBanner").innerHTML = listener.supported ? "" : (p => `<div class="banner"><b>${esc(p.t)}.</b> ${esc(p.d)}</div>`)(asrProblem(null));
}

const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0");

async function begin(){
  if(S.running || S.arming) return;   // a second Space used to start a run on top of the first
  S.arming = true;
  $("boothBanner").innerHTML = "";
  try{ await audio.open(); }
  catch(e){
    $("boothBanner").innerHTML =
      `<div class="banner err"><b>No microphone.</b> Speakeasy needs mic access to give you feedback.
       Allow it in the address bar and press Start again. If you opened this file directly, serve it over
       http instead — browsers block microphones on <code>file://</code> in most cases.</div>`;
    S.arming = false;
    return;
  }
  await calibrateRoom();
  if(!S.arming) return;              // cancelled while the room was being measured
  await countdown();
  if(!S.arming) return;              // cancelled mid-countdown
  S.arming = false;
  start();
}

/* Measure the room before every run. This is the whole trick: the speech gate
   is set relative to what silence actually sounds like here, today, on this
   mic — not to a constant that is wrong in most rooms. */
function calibrateRoom(){
  return new Promise(res=>{
    S.cdDone = res;
    cdShow();
    $("cd-n").textContent = "···";
    $("cd-t").textContent = "Listening to your room";
    $("cd-p").textContent = "Stay quiet for a second — this is how it learns to tell you apart from the background.";
    S.vad.calib = [];
    const iv = setInterval(()=> S.vad.sample(audio.probe().rms), 40);
    setTimeout(()=>{ clearInterval(iv); if(!S.arming) return; S.vad.commit(); updateRoomChip(); res(); }, 1100);
  });
}

/* Make transcription's state visible instead of leaving an empty space where
   words should be. Silence used to be indistinguishable from failure. */
function updateAsrChip(){
  const chip = $("asrChip");
  let label, bad = false;
  if(!listener.supported){ label = "off"; bad = true; }
  else if(listener.err && !listener.want){ label = "failed"; bad = true; }
  else if(!S.running) label = "ready";
  else if(listener.gotAny) label = "on";
  else label = "listening…";
  chip.innerHTML = `Transcript <b>${label}</b>`;
  chip.style.borderColor = bad ? css("--live") : "";

  const box = $("liveText");
  if(!S.running || listener.gotAny) return;
  // running with nothing yet: say so rather than showing a blank
  box.innerHTML = `<span class="waiting">${
    !listener.supported ? "No transcription in this browser — the recording and meters still work."
    : listener.err && !listener.want ? esc(asrProblem(listener.err).t) + " — see the notice above."
    : "Listening… your words will appear here as you speak."}</span>`;
}

function updateRoomChip(){
  const r = S.vad.roomLevel(), chip = $("roomChip");
  const noisy = r >= 34;
  chip.innerHTML = `Room <b>${r < 12 ? "quiet" : r < 34 ? "ok" : "noisy"}</b>`;
  chip.style.borderColor = noisy ? css("--live") : "";
  chip.title = `Background noise measured at ${r}/100. The speech gate is set from this.`;
  $("boothBanner").innerHTML = noisy
    ? `<div class="banner"><b>Your room is noisy.</b> The gate is set above the background, so quiet
       speech may not register. Move somewhere quieter, get closer to the mic, or set sensitivity to
       <b>Quiet voice</b> below.</div>` : "";
}

function countdown(){
  return new Promise(res=>{
    let n = S.drill.prep;
    S.cdDone = res;                    // the Echo branch resolves without ever setting an interval
    /* Echo speaks its line and finishes on a speech callback, with a timeout as
       a backstop. Cancel mid-sentence and both are still queued — without this
       they land inside the *next* run and tear down a countdown that just began. */
    const tok = ++S.cdToken, live = () => tok === S.cdToken;
    $("cd-p").textContent = S.run.cd || "";
    cdShow();
    if(S.run.speak && window.speechSynthesis){
      $("cd-t").textContent = "Listen";
      const u = new SpeechSynthesisUtterance(S.run.speak);
      u.rate = .92; u.pitch = 1;
      const v = speechSynthesis.getVoices().find(v=>/en-GB|en-US/.test(v.lang) && !/google/i.test(v.name));
      if(v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      u.onend = () => { if(!live()) return; $("cd-n").textContent = "Go"; setTimeout(done, 550); };
      setTimeout(done, 9000);
      $("cd-n").textContent = "♪";
      return;
    }
    $("cd-t").textContent = n>6 ? "Think. Pick your last sentence." : "Get ready";
    $("cd-n").textContent = n;
    S.cdIv = setInterval(()=>{
      n--;
      if(n<=0){ done(); return; }
      $("cd-n").textContent = n;
      if(n<=3) $("cd-t").textContent = "Breathe out";
    }, 1000);
    function done(){
      if(!live()) return;
      S.cdToken++; clearInterval(S.cdIv); S.cdIv = null; cdHide(); res();
    }
  });
}

function start(){
  S.running = true; S.t0 = performance.now(); S.lastFrame = S.t0; S.lastSample = 0;
  S.speakTime = 0; S.levelSum = 0; S.levelN = 0; S.rmsSum = 0; S.rmsN = 0;
  S.goodPauses = 0; S.longPause = 0;
  S.roomFrames = 0; S.noiseFrames = 0; S.wordTimes = [];
  S.voiced = false; S.silentSince = S.t0; S.lastFillers = 0; S.coachAt = 0;
  document.body.classList.add("live");
  $("ribbonHint").style.display = "none";
  $("setupRow").style.display = "none";        // length is locked once the clock starts
  $("goBtn").textContent = "Stop"; $("goBtn").className = "btn rec";
  $("skipBtn").disabled = true;
  $("coach").innerHTML = "<b>Go.</b>";
  audio.startRecording();
  if(listener.supported){
    listener.onUpdate = onTranscript;
    listener.onStatus = updateAsrChip;
    listener.onError = code => {
      const p = asrProblem(code);
      $("boothBanner").innerHTML = `<div class="banner err"><b>${esc(p.t)}.</b> ${esc(p.d)}
        The timer, level meter and recording keep working without it.</div>`;
      updateAsrChip();
    };
    listener.start();
  }
  updateAsrChip();
  loop();
}

function loop(){
  if(!S.running) return;
  S.raf = requestAnimationFrame(loop);
  const now = performance.now(), dt = (now - S.lastFrame)/1000; S.lastFrame = now;
  S.elapsed = (now - S.t0)/1000;

  const p = audio.probe();
  const on = S.vad.step(p.rms, p.ratio, now);
  S.noiseFrames++; if(!on && p.rms > S.vad.floor*1.6) S.roomFrames++;

  S.buf.push(p.level); S.bufV.push(on ? 1 : 0);
  if(S.buf.length > 1200){ S.buf.shift(); S.bufV.shift(); }
  // the lamp answers your voice, not the room
  document.documentElement.style.setProperty("--glow", (p.level * (on ? 0.9 : 0.12)).toFixed(3));

  if(now - S.lastSample > 50){                                          // 20 Hz
    S.lastSample = now; S.tape.push(p.level); S.tapeV.push(on ? 1 : 0);
  }

  if(on){
    S.speakTime += dt; S.levelSum += p.level; S.levelN++;
    S.rmsSum += p.rms; S.rmsN++;                    // projection measures you, not the room
    if(!S.voiced){
      // measure the gap between real voice, not between hangover edges
      const gap = (S.vad.aboveSince - S.silentSince)/1000;
      if(gap > 0.35 && S.silentSince > S.t0 + 500){
        S.longPause = Math.max(S.longPause, gap);
        if(gap >= 0.4 && gap <= 2.2){ S.goodPauses++; S.marks.push({t:S.elapsed, type:"pause"}); }
      }
      S.voiced = true;
    }
  }else if(S.voiced){ S.voiced = false; S.silentSince = S.vad.lastVoiced; }

  drawRibbon(S.buf, S.bufV, S.flashUntil);
  tick();

  if(S.dur && S.elapsed >= S.dur) finish();
}

function tick(){
  const left = S.dur ? Math.max(0, S.dur - S.elapsed) : S.elapsed;
  $("clock").textContent = fmt(left);
  $("clock").classList.toggle("warn", !!S.dur && left <= 10);

  const proj = S.rmsN ? projFromRms(S.rmsSum/S.rmsN) : 0;
  set("proj", proj, proj, proj>=50&&proj<=82 ? "good" : proj<50 ? "warn" : "hot");

  if(S.run.framework && S.dur){
    let acc = 0, p = S.elapsed/S.dur, at = -1;
    S.run.framework.steps.forEach((s,i)=>{ if(p>=acc) at=i; acc+=s.w; });
    [...$("promptBox").querySelectorAll(".step")].forEach((el,i)=>{
      el.classList.toggle("now", i===at); el.classList.toggle("done", i<at);
    });
  }
  if(!S.run.target){
    set("extra", S.goodPauses, Math.min(100, S.goodPauses*12), S.goodPauses>=3?"good":"");
  }

  const now = performance.now();
  if(now - S.coachAt > 3400){ S.coachAt = now; liveCoach(); }
}

function set(k, val, pct, cls){
  const v = $("v-"+k);
  if(k==="pace") v.innerHTML = (val||"—") + "<small>wpm</small>";
  else v.textContent = val;
  $("b-"+k).style.width = clamp(pct,0,100) + "%";
  $("m-"+k).className = "mtr" + (cls ? " "+cls : "");
}

function onTranscript(final, interim){
  const all = (final + " " + interim).trim();
  const f = countFillers(all);
  const w = words(all).length;

  /* Stamp each new word with the moment it appeared, so playback can follow
     the text later. Recognition streams interim results word by word, so this
     tracks speech closely; it only ever grows, because Chrome revises interim
     text and a shrinking count must not rewrite times already recorded. */
  const seen = tokens(all).length;
  while(S.wordTimes.length < seen) S.wordTimes.push(S.elapsed);
  // hold the pace readout until there’s enough speech for it to mean anything,
  // otherwise the first three words read as 600 wpm
  const wpm = (w >= 8 && S.elapsed > 5) ? Math.round(w/(S.elapsed/60)) : 0;

  set("pace", wpm||"", wpm ? clamp((wpm/220)*100,0,100) : 0,
      !wpm ? "" : wpm>=125&&wpm<=175 ? "good" : (wpm>190||wpm<105) ? "hot" : "warn");
  set("fill", f.total, Math.min(100, f.total*9),
      f.hard>0 ? "hot" : f.total>3 ? "warn" : f.total===0 ? "good" : "");

  if(f.total > S.lastFillers){
    S.lastFillers = f.total;
    S.flashUntil = performance.now() + 420;
    S.marks.push({t:S.elapsed, type:"filler"});
    $("coach").classList.add("flash");
    setTimeout(()=>$("coach").classList.remove("flash"), 420);
  }

  const lt = $("liveText");
  lt.innerHTML = paint(final) + `<span class="interim">${esc(interim)}</span>`;
  lt.scrollTop = lt.scrollHeight;

  if(S.wEls.length){
    const acc = markTargets(all);
    if(S.run.target) set("extra", acc + "%", acc, acc>=85?"good":acc>=65?"warn":"hot");
  }
}

/* one pass over the text so multi-word crutches ("you know", "i mean") highlight too */
const FILLER_RE = new RegExp("\\b(" +
  [...HARD, ...CRUTCH].sort((a,b)=>b.length-a.length).map(f=>f.replace(/ /g,"\\s+")).join("|") +
  ")\\b", "gi");
function paint(text){
  return esc(text).replace(FILLER_RE, m =>
    `<span class="${HARD.includes(m.toLowerCase().replace(/\s+/g," ")) ? "f" : "c"}">${m}</span>`);
}

/* progressive alignment of what you said against the target text */
function markTargets(spoken){
  const hit = matchTarget(spoken, S.run.target || "");
  let hits = 0;
  S.wEls.forEach((el,i) => { el.className = hit[i] ? "hit" : ""; if(hit[i]) hits++; });
  return S.wEls.length ? Math.round(100*hits/S.wEls.length) : 0;
}

function liveCoach(){
  const c = $("coach");
  if(!listener.supported){
    c.innerHTML = `<b>Keep going.</b> Live transcription isn’t available in this browser, so watch the level meter and the clock — the recording is still being made.`;
    return;
  }
  const t = listener.text(), f = countFillers(t), w = words(t).length;
  const wpm = w ? Math.round(w/(Math.max(S.elapsed,3)/60)) : 0;
  let msg;
  if(w < 4) msg = "<b>Start talking.</b> First sentence out loud, even if it’s rough.";
  else if(f.hard >= 2) msg = "<b>Close your mouth instead.</b> A pause costs you nothing. An <i>um</i> costs you authority.";
  else if(wpm > 185) msg = "<b>Slow down.</b> You’re ahead of the room. Full stop, breath, continue.";
  else if(wpm && wpm < 105) msg = "<b>Commit to the sentence.</b> Decide where it ends, then say the whole thing.";
  else if(f.crutch >= 4) msg = "<b>Drop the padding.</b> <i>Like, basically, actually</i> — the sentence works without them.";
  else if(S.run.framework) msg = "<b>Stay on the highlighted step.</b> Finish it before you move on.";
  else msg = "<b>Good.</b> Hold this pace and keep the pauses deliberate.";
  c.innerHTML = msg;
}

async function finish(){
  if(!S.running) return;
  S.running = false;
  cancelAnimationFrame(S.raf);
  document.body.classList.remove("live");
  document.documentElement.style.setProperty("--glow", 0);
  listener.stop();
  $("skipBtn").disabled = false;
  const url = await audio.stopRecording();
  S.audioURL = url;

  const text = listener.text();
  const f = countFillers(text);
  const wCount = words(text).length;
  const mins = Math.max(S.elapsed, 1)/60;
  const longEnough = S.elapsed >= 5 && wCount >= 8;   // below this, wpm is noise

  const m = {
    wpm: listener.supported && longEnough ? Math.round(wCount/mins) : null,
    artic: S.speakTime>3 && longEnough ? Math.round(wCount/(S.speakTime/60)) : null,
    f, words:wCount,
    proj: S.rmsN ? projFromRms(S.rmsSum/S.rmsN) : 0,
    // how far your voice sits above the room, in dB — the other half of projection
    snr: S.rmsN ? Math.round(20*Math.log10((S.rmsSum/S.rmsN)/Math.max(S.vad.floor,1e-5))) : null,
    acc: null, coverage: null,
    var: listener.supported ? variety(text) : null,
    goodPauses: S.goodPauses,
    longPause: S.longPause,
    pauseScore: null,
    usedWord: S.run.requireWord ? usedWord(text, S.run.requireWord) : null,
    quiet: S.elapsed>0 ? Math.round(100*(1 - S.speakTime/S.elapsed)) : 0,
    room: S.vad.roomLevel()
  };
  const ppm = S.goodPauses/Math.max(mins,.2);
  m.pauseScore = Math.round(band(ppm, 5, 10, 11));   // 5–10 deliberate pauses a minute
  if(S.run.target && listener.supported){
    const st = readStats(text, S.run.target);
    m.acc = st.acc;                 // diction over the words you reached
    m.coverage = st.coverage;       // how much of the passage you got through
  }
  if(m.usedWord === true)  m.acc = 100;                       // used it in a real sentence
  if(m.usedWord === false) m.acc = Math.min(m.acc ?? 100, 40); // the whole point of the drill

  const {score, parts} = scoreRun(m, S.run, S.drill.id);
  const sess = {
    at: Date.now(), drill: S.drill.id, name: S.drill.name, score,
    elapsed: S.elapsed, tape: S.tape, tapeV: S.tapeV, marks: S.marks, text, m, parts, playhead:null,
    wordTimes: S.wordTimes.slice(),
    // what the drill actually asked, so the coach can judge whether they answered it
    run: { question: S.run.cd || null, target: S.run.target || null,
           display: S.run.display || null,
           framework: S.run.framework ? S.run.framework.name : null }
  };
  // keep the component scores, not just the total: the plan picks your weakest
  // metric from these, and Progress trends each one separately
  store.add({ at:sess.at, drill:sess.drill, name:sess.name, score, wpm:m.wpm, fillers:f.total,
    parts: Object.fromEntries(parts.map(p => [p.k, p.v])) });
  markPlanDone(sess.drill);
  showReport(sess);
}

/* ══ 10. REPORT ══════════════════════════════════════════════════════ */

function showReport(sess){
  view("report");
  S.lastSession = sess;                       // kept so a theme switch can repaint the tape
  const m = sess.m, [title, sub] = verdict(sess.score);
  $("r-score").style.color = scoreColor(sess.score);
  countTo($("r-score"), sess.score);
  $("r-kicker").textContent = sess.name + " · " + fmt(sess.elapsed);
  $("r-title").textContent = title;
  $("r-sub").textContent = sub;
  $("tapeLen").textContent = fmt(sess.elapsed) + " of tape";
  drawRings(sess.parts);
  $("r-title").focus();                       // move focus so the result is announced

  requestAnimationFrame(()=>drawTape(sess));
  const cv = $("tape");
  cv.onclick = e => {
    const r = cv.getBoundingClientRect();
    const t = ((e.clientX - r.left)/r.width) * sess.elapsed;
    const a = $("playback");
    if(a.src){ a.currentTime = t; a.play(); }
    sess.playhead = t; drawTape(sess);
  };
  const a = $("playback");
  if(S.audioURL){
    a.src = S.audioURL; a.style.display = "";
    const follow = () => { sess.playhead = a.currentTime; drawTape(sess); syncSaid(a.currentTime); };
    a.ontimeupdate = follow;
    a.onseeked = follow;                      // jumping on the tape moves the text too
    // only dim the unread trail while it is actually running
    a.onplay  = () => $("saidWrap").classList.add("playing");
    a.onpause = () => $("saidWrap").classList.remove("playing");
    a.onended = () => $("saidWrap").classList.remove("playing");
  } else { a.style.display = "none"; }

  const row = (k,v,cls) => `<div class="row"><span>${k}</span><b class="${cls||""}">${v}</b></div>`;
  const g = (v,lo,hi) => v==null ? "" : (v>=lo&&v<=hi ? "g" : "w");
  $("r-rows").innerHTML = [
    m.wpm!=null ? row("Pace", m.wpm+" wpm", g(m.wpm,125,175)) : row("Pace","not measured",""),
    m.artic!=null ? row("Rate while speaking", m.artic+" wpm","") : "",
    row("Hard fillers", m.f.hard, m.f.hard===0?"g":"r"),
    row("Crutch words", m.f.crutch, m.f.crutch<=3?"g":"w"),
    row("Projection", m.proj, g(m.proj,50,82)),
    m.snr!=null ? row("Voice above room", m.snr + " dB", m.snr>=15?"g":m.snr>=8?"w":"r") : "",
    m.acc!=null ? row("Diction on what you read", m.acc+"%", m.acc>=85?"g":m.acc>=65?"w":"r") : "",
    m.coverage!=null ? row("Passage reached", m.coverage+"%", m.coverage>=90?"g":m.coverage>=60?"w":"r") : "",
    m.var!=null ? row("Word variety", m.var+"%", m.var>=52?"g":"w") : "",
    row("Deliberate pauses", m.goodPauses, m.goodPauses>=3?"g":"w"),
    row("Longest silence", m.longPause.toFixed(1)+"s", m.longPause<3?"g":"w"),
    row("Words spoken", m.words, ""),
    row("Speaking time", Math.round(100-(m.quiet||0))+"% of session", ""),
    m.room!=null ? row("Room noise", m.room + "/100", m.room<12?"g":m.room<34?"w":"r") : "",
    m.usedWord!=null ? row("Used the target word", m.usedWord?"yes":"no", m.usedWord?"g":"r") : ""
  ].join("");

  $("r-notes").innerHTML = coachNotes(m, S.run, sess.drill, sess.score)
    .map(([h,b])=>`<li><b>${esc(h)}</b> ${esc(b)}</li>`).join("");
  $("r-said")._cur = undefined;
  renderRead(sess);
  renderSaid(sess);

  // if this drill was part of today's session, hand them straight to the next one
  const plan = readPlan(), nxt = nextInPlan(plan), inPlan = plan.drills.includes(sess.drill);
  const nextBtn = $("planNextBtn");
  nextBtn.hidden = !(inPlan && nxt);
  $("againBtn").className = nextBtn.hidden ? "btn primary" : "btn";
  if(!nextBtn.hidden) nextBtn.textContent = "Next: " + drillById(nxt).name;
  if(inPlan) $("r-kicker").textContent += nxt
    ? ` · ${plan.done.length} of ${plan.drills.length} done today`
    : " · today's session complete";

  renderLocalFindings(sess);
  paintTiers();
}

/* ══ 10b. UI PRIMITIVES ══════════════════════════════════════════════
   Native takes on the patterns these effects libraries popularised:
   number ticker, radial gauge, spotlight card, split-text reveal.      */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const scoreColor = v => v>=76 ? css("--meter") : v>=55 ? css("--tungsten") : css("--live");

/* number ticker */
function countTo(el, target, ms=1200){
  if(reduced()){ el.textContent = target; return; }
  const t0 = performance.now();
  (function step(now){
    const p = Math.min(1, (now - t0)/ms);
    el.textContent = Math.round(target * (1 - Math.pow(1-p, 4)));   // easeOutQuart
    if(p < 1) requestAnimationFrame(step);
  })(t0);
}

/* radial gauges — one per scored component, so the weakest link is obvious */
function drawRings(parts){
  const box = $("r-rings"), head = $("ringHead");
  head.style.display = parts && parts.length ? "" : "none";
  if(!parts || !parts.length){ box.innerHTML = ""; return; }
  const R = 26, C = 2*Math.PI*R;
  box.innerHTML = parts.map((p,i)=>{
    const col = scoreColor(p.v);
    return `<div class="ring" data-reveal style="--i:${i}">
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle class="tr" cx="34" cy="34" r="${R}" fill="none" stroke-width="6"/>
        <circle class="fg" cx="34" cy="34" r="${R}" fill="none" stroke-width="6" stroke="${col}"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"
          data-off="${(C*(1 - p.v/100)).toFixed(1)}"/>
      </svg>
      <div class="rv" style="color:${col}">${p.v}</div>
      <div class="rk">${esc(p.label)}</div>
    </div>`;
  }).join("");
  reveal(box);
  // set the real offset on the next frame so the arc sweeps into place
  requestAnimationFrame(()=> box.querySelectorAll(".fg")
    .forEach(c => c.style.strokeDashoffset = c.dataset.off));
}

/* spotlight that follows the pointer across the drill cards */
function wireSpotlight(){
  $("drillGrid").addEventListener("pointermove", e => {
    const card = e.target.closest(".card"); if(!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
}

/* split the headline so each word can arrive on its own beat */
function splitHero(){
  [["Say","it","once."], ["Say","it","clearly."]].forEach((line, li) => {
    $("ln" + (li+1)).innerHTML = line
      .map((w,i)=>`<span class="w" data-reveal style="--i:${li*3 + i}">${w}</span>`).join(" ");
  });
}

/* play the staggered reveal on everything inside root that asks for one */
function reveal(root){
  if(reduced()) return;
  const els = (root || document).querySelectorAll("[data-reveal]");
  els.forEach(el => el.classList.add("pre"));
  // two frames: one to commit .pre, one to remove it so the transition runs
  requestAnimationFrame(()=> requestAnimationFrame(()=>
    els.forEach(el => el.classList.remove("pre"))));
}

/* ══ 10c. DURATION PICKER ════════════════════════════════════════════ */

const DUR_LABEL = {30:"30s", 60:"1 min", 90:"90s", 120:"2 min"};
const SENS = [["Strict",0.7], ["Normal",1], ["Quiet voice",1.5]];
function buildSetup(){
  const row = $("setupRow");
  // reading drills take their length from the passage, so only offer it elsewhere
  const len = S.run.target ? "" :
    `<span class="lab">Length</span>` + Object.keys(DUR_LABEL).map(d =>
      `<button class="pill" data-dur="${d}" aria-pressed="${+d === S.dur}">${DUR_LABEL[d]}</button>`).join("");
  row.innerHTML = len +
    `<span class="lab"${len ? ' style="margin-left:12px"' : ""}>Mic</span>` +
    SENS.map(([k,v]) =>
      `<button class="pill" data-sens="${v}" aria-pressed="${S.vad.sens === v}">${k}</button>`).join("");
}
$("setupRow").addEventListener("click", e => {
  const b = e.target.closest("[data-dur],[data-sens]");
  if(!b || S.running) return;
  const group = b.dataset.dur ? "dur" : "sens";
  if(group === "dur"){ S.dur = +b.dataset.dur; $("clock").textContent = fmt(S.dur); }
  else S.vad.sens = +b.dataset.sens;
  // only repaint the group that was clicked
  [...$("setupRow").querySelectorAll(`[data-${group}]`)].forEach(p =>
    p.setAttribute("aria-pressed", p === b));
});

/* ══ 10c2. FOLLOW-ALONG TRANSCRIPT ═══════════════════════════════════ */

/* The input side of the session: the passage you were given, marked with what
   actually came through — or, for the drills with no set text, the prompt you
   were answering, so the score has something to be a score *of*. */
function renderRead(sess){
  const wrap = $("readWrap"), box = $("r-read"), hint = $("readHint"), title = $("readTitle");
  const target = sess.run && sess.run.target;

  if(target){
    title.textContent = "What you read";
    const st = readStats(sess.text || "", target);
    hint.textContent = st.covered === 0 ? "Nothing came through"
      : st.missed
        ? `${st.missed} word${st.missed>1?"s":""} didn’t come through — usually a swallowed consonant`
        : st.coverage < 100 ? "Every word you reached came through"
        : "Every word came through";
    // the display string may carry "|" breath marks; they are not target words,
    // so they render as markers without consuming a match index
    let i = 0;
    box.innerHTML = tokens(sess.run.display || target).map(w => {
      if(w === "|") return `<span class="brk">‖</span>`;
      const k = i++;
      // past where you got to is "not reached", which is not the same as misheard
      const cls = k >= st.covered ? "unread" : st.hit[k] ? "hit" : "miss";
      return `<w class="${cls}">${esc(w)}</w>`;
    }).join(" ");
    wrap.style.display = "";
    return;
  }

  const q = sess.run && sess.run.question;
  if(!q){ wrap.style.display = "none"; return; }
  title.textContent = "What you were asked";
  hint.textContent = sess.run.framework ? sess.run.framework : "";
  box.innerHTML = `<div class="q">${esc(q)}</div>`;
  wrap.style.display = "";
}

/* Render the transcript as clickable, timestamped words. */
function renderSaid(sess){
  const box = $("r-said"), hint = $("saidHint");
  const tk = tokens(sess.text || ""), times = sess.wordTimes || [];
  if(!tk.length){
    hint.style.display = "none";
    // a silent session and a broken recogniser look identical unless we say which
    const p = asrProblem(listener.supported && !listener.err ? "silent" : listener.err);
    box.innerHTML = listener.supported && !listener.err
      ? `<span class="waiting">Nothing was transcribed. The audio recorded fine — if you were
         speaking, the recogniser may not have heard you clearly. Try the <b>Quiet voice</b> mic
         setting, or move closer.</span>`
      : `<span class="waiting"><b>${esc(p.t)}.</b> ${esc(p.d)}</span>`;
    return;
  }
  // without timings (no recognition, or an old session) fall back to static text
  if(!times.length){
    box._times = null;
    hint.style.display = "none";
    box.innerHTML = paint(sess.text);
    return;
  }
  hint.style.display = "";
  box._times = tk.map((_,i) => times[i] != null ? times[i] : sess.elapsed);
  const lower = tk.map(w => norm(w));
  // reading a set passage: its crutch words are the author's, so only mark stumbles
  const reading = !!(sess.run && sess.run.target);
  box.innerHTML = tk.map((w,i) => {
    const n = lower[i];
    // two-token lookahead so "you know" and "i mean" highlight as crutches too
    const pair = i+1 < lower.length ? n + " " + lower[i+1] : "";
    const cls = HARD.includes(n) ? "f"
      : reading ? ""
      : (CRUTCH.includes(n) || CRUTCH.includes(pair)
         || (i > 0 && CRUTCH.includes(lower[i-1] + " " + n))) ? "c" : "";
    const t = times[i] != null ? times[i] : sess.elapsed;
    return `<w class="${cls}" data-t="${t.toFixed(2)}">${esc(w)}</w>`;
  }).join(" ");

  box.onclick = e => {
    const w = e.target.closest("w"); if(!w) return;
    const a = $("playback"); if(!a.src) return;
    a.currentTime = Math.max(0, +w.dataset.t - READ_LAG);
    a.play();
  };
}

/* Move the highlight to wherever the audio is now. */
function syncSaid(at){
  const box = $("r-said"), ws = box.querySelectorAll("w");
  if(!ws.length || !box._times) return;
  const cur = wordAt(box._times, at);
  if(cur === box._cur) return;                      // only touch the DOM when it changes
  box._cur = cur;
  ws.forEach((w,i) => {
    w.classList.toggle("past", i < cur);
    w.classList.toggle("now", i === cur);
  });
  if(cur >= 0) keepVisible(box, ws[cur]);
}

/* Scroll the transcript box only — never the page. */
function keepVisible(box, el){
  const top = el.offsetTop - box.offsetTop, h = el.offsetHeight;
  if(top < box.scrollTop + 8) box.scrollTop = top - 8;
  else if(top + h > box.scrollTop + box.clientHeight - 8)
    box.scrollTop = top + h - box.clientHeight + 8;
}

/* ══ 10d. AI COACH ═══════════════════════════════════════════════════
   Everything else in this app is local. This one feature is not: it sends
   the transcript to Anthropic, using a key the user supplies themselves.
   Off by default, one click, and it says exactly what it sends.

   The local metrics already cover delivery mechanics. What they cannot do
   is judge whether the answer was actually well made — structure, hedging,
   vagueness, whether you answered the question. That is what this asks. */

/* ══ ON-DEVICE MODEL ═════════════════════════════════════════════════
   Chrome ships a small language model that runs locally. No key, no request,
   nothing leaves the machine — which fits this app better than any API can.
   It is not always provisioned, so every call is feature-detected and any
   failure is reported rather than swallowed. */
const onDevice = {
  get supported(){ return typeof LanguageModel !== "undefined"; },
  state: null,
  /* availability() can hang on some machines, so it races a timeout — a probe
     that never settles must not leave the panel empty forever. */
  async check(){
    if(!this.supported) return (this.state = "unsupported");
    try{
      this.state = await Promise.race([
        LanguageModel.availability(),
        new Promise(r => setTimeout(() => r("unavailable"), 3000))
      ]);
    }catch(e){ this.state = "unavailable"; }
    return this.state;
  },
  async ask(system, prompt, onProgress){
    const opts = { initialPrompts: [{ role:"system", content: system }] };
    if(onProgress) opts.monitor = m =>
      m.addEventListener("downloadprogress", e => onProgress(Math.round((e.loaded||0)*100)));
    const session = await LanguageModel.create(opts);
    try{ return (await session.prompt(prompt)).trim(); }
    finally{ try{ session.destroy(); }catch(e){} }
  }
};

/* Small models do better with a narrow brief than a long one. */
const ONDEVICE_SYSTEM =
`You are a speaking coach. You are given a transcript of someone practising a spoken answer.
The transcript is from speech recognition: ignore punctuation, capitalisation and spelling entirely.
Judge only the content and structure of what they said.
Reply with exactly three short bullets, each starting with "- ", each under 25 words.
Bullet 1: what worked. Bullet 2: the single biggest weakness. Bullet 3: one concrete rewrite of their weakest sentence.
Be specific and quote their words. No preamble, no headings, no encouragement.`;

const AI_KEY = "speakeasy.anthropicKey";
const readKey  = () => { try{ return localStorage.getItem(AI_KEY) || ""; }catch(e){ return ""; } };
const writeKey = k => { try{ localStorage.setItem(AI_KEY, k); }catch(e){} };

const COACH_SYSTEM = `You are a speaking coach reviewing one transcript from a practice session. The speaker is working on articulation, clarity and confidence in spoken English.

Review CONTENT and STRUCTURE only. Delivery mechanics — pace, filler count, volume, pauses — are already measured locally and given to you as context. Do not re-report those numbers; reference them only when they explain something about the content.

The transcript comes from automatic speech recognition. Its punctuation is unreliable, it drops words, and it mangles names. Never comment on spelling, punctuation or capitalisation, and assume a broken-looking sentence is a transcription artefact unless the pattern repeats.

Reply in exactly these four sections, using these headings verbatim:

## Structure
Did the answer have a shape? If a framework was given, did they actually follow it? Two or three sentences.

## Language
Where was the wording vague, hedged, or repetitive? Quote their actual words. Two or three sentences.

## Sharper
Take the single weakest sentence they said and rewrite it. Give exactly one example, as two lines:
You said: "..."
Tighter: "..."

## Next
One sentence naming the specific thing to practise next.

Be concrete and honest. Do not open with praise and do not flatter. If it was genuinely good, say so in one clause and move on. Never exceed 200 words in total.`;

function coachPrompt(sess){
  const m = sess.m, r = sess.run || {};
  const facts = [
    `Drill: ${sess.name}`,
    r.question ? `Prompt they were answering: "${r.question}"` : null,
    r.framework ? `Framework given: ${r.framework}` : null,
    r.target ? `They were reading a set passage, so judge delivery of it, not their word choice.` : null,
    `Spoke for ${Math.round(sess.elapsed)}s at ${m.wpm ?? "unknown"} wpm.`,
    `Hard fillers: ${m.f.hard}. Crutch words: ${m.f.crutch}. Deliberate pauses: ${m.goodPauses}.`
  ].filter(Boolean).join("\n");
  return `${facts}\n\nTranscript:\n"""\n${sess.text || "(nothing was transcribed)"}\n"""`;
}

async function askCoach(sess){
  const { default: Anthropic } = await import("https://esm.sh/@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey: readKey(),
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" }
  });
  const res = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: COACH_SYSTEM,
    messages: [{ role: "user", content: coachPrompt(sess) }]
  });
  if(res.stop_reason === "refusal")
    throw new Error("The model declined to review this transcript.");
  return res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

/* the reply is four fixed `## ` sections — render those, nothing more */
function renderCoach(md){
  return md.split(/^##\s+/m).filter(s => s.trim()).map(sec => {
    const nl = sec.indexOf("\n");
    const head = (nl < 0 ? sec : sec.slice(0, nl)).trim();
    const body = (nl < 0 ? "" : sec.slice(nl)).trim();
    const paras = body.split(/\n{2,}|\n(?=You said:|Tighter:)/).filter(Boolean).map(p => {
      const q = /^(You said:|Tighter:)/.test(p.trim());
      return `<p class="${q ? "quote" : ""}">${esc(p.trim())}</p>`;
    }).join("");
    return `<h4>${esc(head)}</h4>${paras}`;
  }).join("");
}

/* The always-on tier: runs instantly, offline, in every browser, no model. */
function renderLocalFindings(sess){
  const box = $("localFindings");
  const found = analyseLanguage(sess.text || "",
    { framework: sess.run && sess.run.framework, target: sess.run && sess.run.target });

  if(!(sess.text || "").trim()){
    box.innerHTML = `<p class="note">No transcript to read, so there is nothing to analyse.</p>`;
    return;
  }
  if(!found.length){
    box.innerHTML = `<p class="note"><b>Nothing weak enough to flag.</b> No hedging, padding or
      repetition worth mentioning in what you said. Read the transcript above and see whether it
      says what you meant it to.</p>`;
    return;
  }
  box.innerHTML = `<p class="eyebrow" style="margin-bottom:10px">Read on this device · ${found.length}
    ${found.length === 1 ? "habit" : "habits"} worth breaking</p>
    <ul class="notes">` +
    found.slice(0, 4).map(f => `<li><b>${esc(f.title)}.</b> ${esc(f.detail)}</li>`).join("") +
    `</ul>`;
}

/* Offer whichever deeper review this browser can actually do.
   Renders immediately from what is already known, then re-renders once the
   on-device probe answers — so a slow or hanging probe never leaves a blank. */
function paintTiers(){
  drawTiers();
  if(onDevice.supported && onDevice.state === null)
    onDevice.check().then(() => { if($("aiBody")) drawTiers(); });
}

function drawTiers(){
  const box = $("aiBody"), state = onDevice.state;
  const local = state === "available" || state === "downloadable" || state === "downloading";
  const hasKey = !!readKey();

  const onDeviceBtn = !local ? "" :
    `<button class="btn ${hasKey ? "" : "primary"}" id="aiLocalGo">${
      state === "available" ? "Ask the on-device model" : "Download the on-device model"
    }</button>`;
  const apiBtn = hasKey
    ? `<button class="btn primary" id="aiGo">Ask Claude</button>
       <button class="btn" id="aiForget">Forget key</button>`
    : `<button class="btn" id="aiKeyBtn">Use Claude instead…</button>`;

  const blurb = local
    ? `Your browser has a language model built in. It runs <b>on this device</b> — no key, no account,
       and nothing sent anywhere.${state !== "available" ? " It needs a one-off download first." : ""}`
    : state === null && onDevice.supported
      ? `Checking whether this browser can run a model on-device…`
      : `This browser has no on-device model available. Claude gives a sharper read, but it does send
         your transcript — the only thing here that leaves your device.`;

  box.innerHTML = `
    <p class="note" style="margin:14px 0 12px">${blurb}</p>
    <div class="airow">${onDeviceBtn}${apiBtn}</div>`;

  if($("aiLocalGo")) $("aiLocalGo").onclick = runLocalModel;
  if($("aiGo")) $("aiGo").onclick = runCoach;
  if($("aiForget")) $("aiForget").onclick = () => { writeKey(""); paintTiers(); };
  if($("aiKeyBtn")) $("aiKeyBtn").onclick = () => paintAI("needkey");
}

async function runLocalModel(){
  const sess = S.lastSession;
  if(!sess || !sess.text || words(sess.text).length < 8)
    return paintAI("error", "There is no transcript to review.");
  paintAI("working", "Thinking on this device…");
  try{
    const reply = await onDevice.ask(ONDEVICE_SYSTEM, coachPrompt(sess),
      pct => paintAI("working", `Downloading the model… ${pct}%`));
    paintAI("done", reply, "on-device");
  }catch(e){
    paintAI("error", (e && e.message) || "The on-device model could not run.");
  }
}

function paintAI(state, payload, engine){
  const box = $("aiBody");
  if(state === "needkey"){
    box.innerHTML = `
      <p class="note" style="margin-bottom:12px">The scores above measure how you spoke. This asks Claude
        to judge <b>what you actually said</b> — structure, hedging, vagueness — which no amount of signal
        processing can do.</p>
      <div class="airow">
        <label class="sr" for="aiKey">Anthropic API key</label>
        <input id="aiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false">
        <button class="btn" id="aiSave">Save key</button>
        <button class="btn" id="aiCancelKey">Cancel</button>
      </div>
      <p class="note"><b>This is the one thing here that leaves your device.</b> Your key is stored only in
        this browser, and the transcript is sent to Anthropic when you press the button — never automatically,
        and never your audio. Get a key at <a href="https://console.anthropic.com/settings/keys"
        target="_blank" rel="noopener">console.anthropic.com</a>.</p>`;
    $("aiSave").onclick = () => {
      const k = $("aiKey").value.trim();
      if(!k) return;
      writeKey(k); paintTiers();
    };
    $("aiKey").onkeydown = e => { if(e.key === "Enter") $("aiSave").click(); };
    $("aiCancelKey").onclick = () => paintTiers();
    return;
  }
  if(state === "working"){
    box.innerHTML = `<p class="working">${esc(payload || "Reading your transcript…")}</p>`;
    return;
  }
  if(state === "error"){
    box.innerHTML = `<div class="banner err"><b>Review failed.</b> ${esc(payload)}</div>
      <div class="airow"><button class="btn" id="aiBack">Back</button></div>`;
    $("aiBack").onclick = () => paintTiers();
    return;
  }
  box.innerHTML =
    `<p class="eyebrow" style="margin:14px 0 10px">${engine === "on-device"
      ? "Read by the model on this device" : "Read by Claude"}</p>` +
    renderCoach(payload) +
    `<div class="airow" style="margin-top:16px"><button class="btn" id="aiAgain">Ask again</button></div>`;
  $("aiAgain").onclick = () => paintTiers();
}

async function runCoach(){
  const sess = S.lastSession;
  if(!sess) return;
  if(!sess.text || words(sess.text).length < 8)
    return paintAI("error", "There is no transcript to review — nothing was picked up this session.");
  paintAI("working");
  try{ paintAI("done", await askCoach(sess)); }
  catch(e){
    const msg = /401|authentication/i.test(e.message) ? "That API key was rejected."
      : /rate|429/i.test(e.message) ? "Rate limited by the API. Wait a moment and try again."
      : /Failed to fetch|NetworkError|dynamically imported/i.test(e.message)
        ? "Could not reach the API. Check your connection — this feature needs network access."
        : e.message || "Unknown error.";
    paintAI("error", msg);
  }
}

/* ══ 11. HOME ════════════════════════════════════════════════════════ */

function renderHome(){
  const d = store.read(), ss = d.sessions;
  const st = streak(ss);
  $("streakChip").innerHTML = st ? `Day <b>${st}</b>` : `No streak <b>yet</b>`;

  const best = id => { const r = ss.filter(s=>s.drill===id); return r.length ? Math.max(...r.map(s=>s.score)) : null; };
  $("drillGrid").innerHTML = DRILLS.map((dr,i)=>{
    const b = best(dr.id);
    return `<button class="card" data-drill="${dr.id}" data-reveal style="--accent:${dr.accent};--i:${i}">
      <span class="spot" aria-hidden="true"></span>
      <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${dr.icon}"/></svg></span>
      <h3>${dr.name}</h3>
      <p class="d">${dr.desc}</p>
      <span class="meta"><span class="tag">${dr.tag}</span>
      ${b!=null ? `<span class="best">best ${b}</span>` : `<span class="best" style="opacity:.55">new</span>`}</span>
    </button>`;
  }).join("");

  const recent = ss.slice(-30);
  const avg = recent.length ? Math.round(recent.reduce((s,x)=>s+x.score,0)/recent.length) : 0;
  const bestAll = ss.length ? Math.max(...ss.map(s=>s.score)) : 0;
  const paced = ss.filter(s=>s.wpm);
  const wpm = paced.length ? Math.round(paced.slice(-10).reduce((s,x)=>s+x.wpm,0)/Math.min(paced.length,10)) : null;
  let si = 0;
  const stat = (n,k)=>`<div class="stat" data-reveal style="--i:${si++}"><div class="n">${n}</div><div class="k">${k}</div></div>`;
  $("stats").innerHTML =
    stat(ss.length, "Sessions") + stat(st, "Day streak") +
    stat(avg||"—", "Avg clarity") + stat(bestAll||"—", "Personal best") +
    stat(wpm||"—", "Recent pace");
  requestAnimationFrame(()=>drawHistory(ss));

  renderPlan();
}

/* Today's session: three drills aimed at your weakest metrics, so the choice
   is already made. The strip doubles as progress through the day. */
function renderPlan(){
  const p = readPlan(), next = nextInPlan(p), box = $("planStrip");
  const done = p.done.length, total = p.drills.length;

  $("quickStart").dataset.drill = next || p.drills[0];
  $("quickStart").querySelector(".lbl").textContent =
    !next ? "Done today" : done ? "Continue" : "Start today";
  $("quickStart").classList.toggle("complete", !next);

  $("quickNote").textContent = !next
    ? "All three done today. Come back tomorrow, or pick any drill below."
    : `${total - done} of ${total} left · about ${(total - done) * 3} minutes`;

  box.innerHTML = p.drills.map((id, i) => {
    const d = drillById(id);
    if(!d) return "";
    const isDone = p.done.includes(id), isNext = id === next;
    const why = p.why && p.why[id];
    const reason = why
      ? "weakest: " + esc(METRIC_NAME[why.metric] || why.metric) + " · " + why.score
      : esc(d.tag.toLowerCase());
    return `<button class="planstep${isDone ? " done" : ""}${isNext ? " next" : ""}"
        data-drill="${id}" style="--accent:${d.accent}">
      <span class="pnum">${isDone ? "&#10003;" : i + 1}</span>
      <span class="pbody">
        <span class="pname">${esc(d.name)}</span>
        <span class="pwhy">${reason}</span>
      </span>
    </button>`;
  }).join("");
}

/* ══ 12. WIRING ══════════════════════════════════════════════════════ */

function bestFor(sessions, id){
  const scores = sessions.filter(s => s.drill === id).map(s => s.score);
  return scores.length ? Math.max(...scores) : null;
}

/* A sparkline as inline SVG — no canvas, so it needs no repaint on theme change. */
function sparkline(values, colour){
  const w = 132, h = 34, pad = 3;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v,i) => {
    const x = pad + (i/(values.length-1 || 1)) * (w - pad*2);
    const y = h - pad - ((v - lo)/span) * (h - pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length-1].split(",");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${colour}" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${colour}"/>
  </svg>`;
}

function renderTrends(){
  const ss = store.read().sessions, box = $("trendWrap");
  const keys = ["pace","filler","proj","acc","cover","var","pause"];
  const rows = keys.map(k => ({ k, t: trendFor(ss, k) })).filter(r => r.t);

  if(!rows.length){
    box.innerHTML = `<div class="block"><p class="empty">Not enough history yet. After three
      sessions this breaks your score into its parts, so you can see which one is moving.</p></div>`;
    return;
  }
  box.innerHTML = `<div class="trends">` + rows.map(({k,t}) => {
    const col = scoreColor(t.now);
    const dir = t.delta > 2 ? "up" : t.delta < -2 ? "down" : "flat";
    const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
    const sign = t.delta > 0 ? "+" : "";
    return `<div class="trend">
      <div class="thead">
        <span class="tname">${esc(METRIC_NAME[k] || k)}</span>
        <span class="tdelta ${dir}">${arrow} ${sign}${t.delta}</span>
      </div>
      <div class="tnow" style="color:${col}">${t.now}</div>
      ${sparkline(t.values, col)}
      <div class="tfoot">${t.n} sessions</div>
    </div>`;
  }).join("") + `</div>`;
}

/* Recent sessions, newest first. The history chart shows the trend; this shows
   the individual runs behind it, so a bad day is legible rather than just a dip. */
function renderRecent(){
  const ss = store.read().sessions.slice().reverse().slice(0, 25);
  const box = $("recentWrap");
  if(!ss.length){
    box.innerHTML = `<div class="block"><p class="empty">Nothing here yet. Finish a drill and every run lands
      in this list 2014 date, drill, score, pace and fillers.</p></div>`;
    return;
  }
  const fmtWhen = new Intl.DateTimeFormat(undefined,
    { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" });
  box.innerHTML = `<div class="block recent">` + ss.map(s => `
    <div class="rrow">
      <b class="rscore" style="color:${scoreColor(s.score)}">${s.score}</b>
      <span class="rname">${esc(s.name)}</span>
      <span class="rwhen">${esc(fmtWhen.format(new Date(s.at)))}</span>
      <span class="rmeta">${s.wpm ? s.wpm + " wpm" : "2014"}</span>
      <span class="rmeta">${s.fillers != null ? s.fillers + " filler" + (s.fillers === 1 ? "" : "s") : "2014"}</span>
    </div>`).join("") + `</div>`;
}

function renderSidebar(){
  const sessions = store.read().sessions;
  $("drillNav").innerHTML = DRILLS.map(dr => {
    const best = bestFor(sessions, dr.id);
    const active = S.drill && S.drill.id === dr.id;
    return `<a href="#drill-${dr.id}" data-drill="${dr.id}" ${active ? 'aria-current="page"' : ''}
      style="--accent:${dr.accent}"><span class="dn" aria-hidden="true"></span><span>${dr.name}</span>
      <span class="dbest">${best == null ? "new" : best}</span></a>`;
  }).join("");

  const total = sessions.length;
  const personalBest = total ? Math.max(...sessions.map(s => s.score)) : "—";
  $("sideStats").innerHTML = `
    <div><span>Sessions</span><b>${total}</b></div>
    <div><span>Streak</span><b>${streak(sessions)} day${streak(sessions) === 1 ? "" : "s"}</b></div>
    <div><span>Best clarity</span><b>${personalBest}</b></div>`;
  $("sideNote").textContent = total
    ? "Choose a drill, then chase one small improvement."
    : "Start with one drill. Your first score sets the baseline.";
}

function openMenu(){
  const side = $("side"), scrim = $("scrim"), layout = document.querySelector(".layout");
  if(!matchMedia("(max-width: 940px)").matches){
    layout.classList.remove("sidebar-collapsed");
    $("sideMenuBtn").setAttribute("aria-expanded", "true");
    $("sideMenuBtn").setAttribute("aria-label", "Hide sidebar");
    return;
  }
  side.classList.add("open");
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add("on"));
}

function closeMenu(){
  const side = $("side"), scrim = $("scrim"), layout = document.querySelector(".layout");
  if(!side || !scrim) return;
  if(!matchMedia("(max-width: 940px)").matches){
    layout.classList.add("sidebar-collapsed");
    $("sideMenuBtn").setAttribute("aria-expanded", "false");
    $("sideMenuBtn").setAttribute("aria-label", "Show sidebar");
    return;
  }
  side.classList.remove("open");
  scrim.classList.remove("on");
  if(!scrim.hidden) setTimeout(() => { if(!side.classList.contains("open")) scrim.hidden = true; }, 280);
}

/* Stop a run without scoring it. Used when the user navigates away mid-session:
   they chose to leave, so the partial recording is discarded rather than saved
   as a bad score. Mirrors finish()'s teardown, minus the report. */
function abortRun(){
  if(!S.running) return;
  S.running = false;
  cancelAnimationFrame(S.raf);
  document.body.classList.remove("live");
  document.documentElement.style.setProperty("--glow", 0);
  listener.stop();
  audio.stopRecording();
  $("skipBtn").disabled = false;
}

function openDrill(id){ navigate("#" + DRILL_HASH + id); }
/* view() first, then render — a canvas in a display:none view measures 0 wide */
function goHome(){ navigate("#practice"); }

/* ══ ROUTING ═════════════════════════════════════════════════════════
   The three sections are real pages, so they live in the URL: deep links,
   bookmarks and browser back all work. Drills and reports stay out of the
   history — they are session state, not places. */
const PAGES = ["practice","progress","guide"];

const DRILL_HASH = "drill-";

/* A drill is a place, not just state. It was previously invisible to history:
   the URL still read #progress while the booth was open, so Back skipped the
   drill and landed somewhere the user had never been. */
function routeFromHash(){
  const h = (location.hash || "").slice(1);
  if(h.startsWith(DRILL_HASH)){
    const id = h.slice(DRILL_HASH.length);
    if(drillById(id)) return { kind:"drill", id };
  }
  return { kind:"page", page: PAGES.includes(h) ? h : "practice", bad: !!h && !PAGES.includes(h) };
}

function goPage(page){
  audio.close();
  view(page);
  if(page === "practice") renderHome();
  if(page === "progress"){ renderTrends(); renderRecent(); repaint(); }
  renderSidebar();
  reveal($("v-" + page));
}

/* Apply whatever the URL currently says. Never writes history itself, except to
   correct a hash that points nowhere — replacing it rather than pushing, so a
   bad link can't become a trap you have to press Back twice to escape. */
function applyRoute(){
  const r = routeFromHash();
  if(S.running) abortRun();        // navigating away from a live run discards it
  armCancel();                     // ...and away from one that hasn't started yet

  if(r.kind === "drill"){
    // navigating to a drill always starts it fresh — including re-picking the
    // one whose report you are looking at, which is the obvious intent
    audio.close();
    newRun(r.id);
    renderSidebar();
    view("booth");
    return;
  }
  if(r.bad) history.replaceState(null, "", "#" + r.page);
  goPage(r.page);
}

/* Setting the hash pushes an entry and fires hashchange, which does the work —
   that is what makes Back and Forward correct. When the hash is already right
   no event fires, so apply it directly. */
function navigate(hash){
  if(location.hash === hash) applyRoute();
  else location.hash = hash;
}

addEventListener("hashchange", applyRoute);

// re-clicking the section you are already on should still take you there
document.querySelectorAll("[data-nav]").forEach(link => link.addEventListener("click", () => {
  if(location.hash === "#" + link.dataset.nav) applyRoute();
}));

$("sideMenuBtn").onclick = () => {
  if(!matchMedia("(max-width: 940px)").matches)
    document.querySelector(".layout").classList.contains("sidebar-collapsed") ? openMenu() : closeMenu();
  else closeMenu();
};
$("menuBtn").onclick = () => {
  const open = $("side").classList.contains("open");
  open ? closeMenu() : openMenu();
  $("menuBtn").setAttribute("aria-expanded", String(!open));
};
$("scrim").onclick = closeMenu;
// Escape closes the drawer, and focus goes back to the control that opened it
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && $("side").classList.contains("open")){
    closeMenu(); $("menuBtn").setAttribute("aria-expanded", "false"); $("menuBtn").focus();
  }
});

document.addEventListener("click", e=>{
  const card = e.target.closest("[data-drill]");
  if(card){ e.preventDefault(); return openDrill(card.dataset.drill); }
});
$("goBtn").onclick = () => S.running ? finish() : begin();
$("skipBtn").onclick = () => { if(!S.running) newRun(S.drill.id); };
$("exitBooth").onclick = () => { if(S.running) finish(); else goHome(); };
$("homeBtn").onclick = goHome;
$("againBtn").onclick = () => { newRun(S.drill.id); view("booth"); };
$("planNextBtn").onclick = () => {
  const nxt = nextInPlan(readPlan());
  if(nxt) openDrill(nxt); else goHome();
};

document.addEventListener("keydown", e=>{
  if(e.target.matches("input,textarea")) return;
  if(e.code==="Space" && $("v-booth").classList.contains("on")){
    e.preventDefault(); S.running ? finish() : begin();
  }
  if(e.key==="Escape" && S.running) finish();
  else if(e.key==="Escape" && S.arming) armCancel();
  else if(e.key === "Escape") closeMenu();
});

function applyTheme(next){
  document.documentElement.dataset.theme = next;
  $("themeBtn").setAttribute("aria-label",
    next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  $("themeColor").setAttribute("content", css("--ink"));
  repaint();                                  // canvases hold baked-in colours
}
$("themeBtn").onclick = () => {
  const next = document.documentElement.dataset.theme==="dark" ? "light" : "dark";
  store.set("theme", next);
  applyTheme(next);
};


/* redraw whatever canvas is on screen — used by theme switch and resize */
function repaint(){
  if($("v-practice").classList.contains("on") || $("v-progress").classList.contains("on")) drawHistory(store.read().sessions);
  else if($("v-report").classList.contains("on") && S.lastSession) drawTape(S.lastSession);
}

/* ══ 13. BOOT ════════════════════════════════════════════════════════ */

(function boot(){
  const saved = store.read().theme;
  applyTheme(saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  // "supported" only means the API exists — whether it actually works shows in the booth
  $("engineNote").textContent = listener.supported
    ? "Transcription available"
    : "No speech recognition in this browser — try Chrome or Edge";

  splitHero();
  renderHome();
  renderSidebar();
  wireSpotlight();
  applyRoute();                    // honour a deep link on first load
  // the idle wave is decorative: hold it still when the user asked for less motion
  (function spin(){
    if($("v-practice").classList.contains("on") && !reduced()) drawIdle();
    requestAnimationFrame(spin);
  })();
  if(reduced()) drawIdle();
  let rt; addEventListener("resize", ()=>{ clearTimeout(rt); rt = setTimeout(repaint, 120); });
  if(window.speechSynthesis) speechSynthesis.getVoices();
})();
