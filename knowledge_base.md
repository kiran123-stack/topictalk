# SpeakArena RAG Guide v3
## Simple English Topics from Latest News, World Events and Selected Subjects

## 1. Purpose
SpeakArena helps students practise speaking, debating and thinking clearly. Generate exactly ONE useful topic per request for daily 1–3 minute practice, college debates, group discussions, MBA and placement interviews, UPSC preparation and general awareness.

**Core rule: Simple English. One clear question. A real issue. More than one reasonable point of view.**

Topics should be easy to understand on the first reading, but interesting enough to make a student think. Do not use difficult words just to sound intelligent.

## 2. What makes a good topic?
A good topic:
- Is usually one short sentence.
- Uses familiar words and explains unfamiliar terms.
- Connects to a real event, decision, trend, policy or everyday dilemma.
- Has at least two reasonable sides.
- Can be discussed without expert knowledge.
- Fits the selected speaking time.
- Is specific, neutral and practical.

Avoid generic topics such as "Importance of Education" or "Is technology good or bad?", long multi-part questions, jargon, unsupported allegations and one-sided political framing.

Style examples only (do not repeat automatically):
- Should schools allow students to use AI for homework?
- Should governments spend more on public hospitals or free medicines?
- Should social media companies be responsible for fake news on their platforms?
- Is it fair to use AI to screen job applications?
- Should cities make public transport cheaper instead of building more roads?
- Should countries put stronger limits on plastic waste?

## 3. Topic modes
Respect the user's selected category or subject.

- **Latest News:** Use a recent, verified event. Prefer the last 1–7 days when the user asks for latest news.
- **India:** Indian news, public policy, schemes, courts, elections, education, jobs, economy, technology, health, environment and society.
- **World News:** International events across different regions: elections, conflicts, diplomacy, trade, climate, technology, public health, migration and business.
- **Government & Public Policy:** Government decisions, public money, affected people and whether a policy is working.
- **Selected Subject:** If the user selects education, AI, business, environment, sports, health or another subject, retrieve knowledge about that subject and create a topic from it.
- **Surprise Topic:** Choose a fresh category and avoid repeating recent categories when possible.

## 4. Topic categories
Use these as a guide, not a fixed limit:
1. India: latest news and public affairs
2. World news and international relations
3. Government schemes and public services
4. Politics, elections and democracy
5. Economy, prices, jobs and business
6. Education, colleges and exams
7. Technology, AI and digital life
8. Health and public welfare
9. Women, children and social development
10. Environment, climate and energy
11. Law, courts and justice
12. Agriculture and rural development
13. Media and misinformation
14. Science and innovation
15. Sports and culture
16. Ethics and everyday decisions
17. Leadership and management
18. Personal finance and consumer issues

## 5. Turn news into a speaking question
Do not copy a headline and call it a topic. Understand the event, then find the issue people can discuss.

Ask:
1. What happened?
2. When and where did it happen?
3. Who is affected?
4. What decision, disagreement or problem does it raise?
5. What are two reasonable ways to look at it?
6. What short question would make a student think?

Examples of transformation:
- News: A government announces support for small businesses. Topic: "Should governments give more financial support to small businesses, or make it easier for them to get private investment?"
- News: A country introduces stricter social media rules. Topic: "Should governments be allowed to remove online content they believe is harmful, even if some people see it as censorship?"
- News: A city considers charging more for driving into a crowded area. Topic: "Should drivers pay an extra fee to use crowded city roads if the money improves public transport?"
- News: A university changes its examination system. Topic: "Should colleges judge students through regular projects and presentations instead of depending mainly on final exams?"

These are style examples, not a fixed topic bank.

## 6. Current-news retrieval rules
**This document is a retrieval guide, not a live news feed.** A static RAG file cannot know what happened today unless fresh news documents are added. When live web search or a news connector is available, use it at generation time.

- "Latest news": prefer stories from the last 1–7 days.
- "This week's topics": use the last 7 days.
- "Current affairs": use recent developments from about the last 30 days, plus important ongoing issues.
- "World news": cover multiple regions; do not focus only on India or the United States.
- "Selected subject": retrieve relevant documents; search recent sources if the user asks for current developments.
- Check both the publication date and the date the event happened.
- Prefer original documents, official statements and direct data for official facts.
- Use established independent reporting for context and different views.
- Confirm important or disputed facts with a second reliable source when possible.
- Do not rely on a headline, social post or search snippet alone.
- Do not present allegations as proven facts.
- Distinguish a proposal, a decision, implementation and proven results.
- If reports conflict, say so or avoid relying on the disputed detail.
- Never invent events, statistics, quotes, schemes or announcements.
- If live search is unavailable, do not pretend a topic is the latest news. Use dated stored material or offer a general topic.

## 7. Recommended sources

A homepage is only a starting point. Retrieve the specific article, report, release or dataset before using facts.

### India: official sources
- Press Information Bureau: https://www.pib.gov.in/
- MyGov: https://www.mygov.in/
- Parliament: https://sansad.in/
- PRS Legislative Research: https://prsindia.org/
- India Code: https://www.indiacode.nic.in/
- Election Commission: https://www.eci.gov.in/
- Supreme Court: https://www.sci.gov.in/
- NITI Aayog: https://www.niti.gov.in/
- Statistics Ministry: https://www.mospi.gov.in/
- Union Budget: https://www.indiabudget.gov.in/
- Reserve Bank of India: https://www.rbi.org.in/
- National Portal of India: https://www.india.gov.in/

### India: independent reporting
- The Hindu: https://www.thehindu.com/
- The Indian Express: https://indianexpress.com/
- Hindustan Times: https://www.hindustantimes.com/
- The Hindu BusinessLine: https://www.thehindubusinessline.com/
- Reuters India: https://www.reuters.com/world/india/
- BBC India: https://www.bbc.com/news/world/asia/india

### World: international reporting
- Reuters World: https://www.reuters.com/world/
- Associated Press: https://apnews.com/
- BBC News: https://www.bbc.com/news
- Al Jazeera: https://www.aljazeera.com/
- Deutsche Welle: https://www.dw.com/
- France 24: https://www.france24.com/
- The Guardian World: https://www.theguardian.com/world
- Financial Times: https://www.ft.com/world

### Global institutions and data
- United Nations: https://www.un.org/
- World Bank: https://www.worldbank.org/
- IMF: https://www.imf.org/
- WHO: https://www.who.int/
- International Labour Organization: https://www.ilo.org/
- World Trade Organization: https://www.wto.org/
- UN Environment Programme: https://www.unep.org/
- UNESCO: https://www.unesco.org/
- International Energy Agency: https://www.iea.org/
- OECD: https://www.oecd.org/

### Science and technology
- Nature News: https://www.nature.com/news
- Science: https://www.science.org/
- MIT Technology Review: https://www.technologyreview.com/
- IEEE Spectrum: https://spectrum.ieee.org/
Prefer original research papers and institutional announcements for technical claims.

### State and local topics
For state-specific topics, retrieve that state's official portal, budget, department releases, assembly documents and reliable local reporting. Do not assume national sources cover state details.

## 8. Selected-subject workflow
When a user selects a subject:
1. Respect the selection; do not silently switch categories.
2. Retrieve relevant RAG documents using the subject and related terms.
3. If latest developments are requested, search current sources about that subject.
4. Find one practical issue, decision, disagreement or trade-off.
5. Generate one clear question.
6. If there is not enough information, say so rather than guessing.

Possible angles:
- Education: exam pressure, attendance, skill-based learning, fees and access.
- AI: jobs, privacy, education, fairness and public services.
- Environment: pollution, transport, energy prices and climate responsibility.
- Business: small firms, jobs, consumer rights and competition.
- Sports: public funding, athlete welfare, access and governance.

## 9. Student-friendly English
- Prefer common English words.
- Keep the question short.
- Explain an unfamiliar name, scheme or technical term in one short context sentence.
- Avoid legal or academic language unless essential.
- Do not overload the question with names, dates and statistics.
- Keep wording neutral; do not tell the student what opinion to hold.

Good: "Should colleges allow students to use AI when preparing assignments?"
Too complex: "Should higher education institutions establish a mandatory regulatory framework governing generative AI use in formative assessment?"

## 10. Quality check
Before returning a topic, check:
1. Can an ordinary college student understand it immediately?
2. Is it specific, not generic?
3. Is it connected to a real issue or useful dilemma?
4. Are there at least two reasonable perspectives?
5. Can someone discuss it for the selected time?
6. Are factual claims supported by retrieved sources?
7. Is it neutral and fair?
8. Is it different from recent topics in history?

If it fails, generate another using retrieved knowledge.

## 11. Non-repetition and privacy
Use existing topic history if available. Avoid exact repeats, minor rewordings, the same dilemma with the same stakeholders, and repeated categories when alternatives exist. Compare meaning, not only exact text. Do not claim perfect non-repetition if history is unavailable.

Do not store speech recordings, transcripts, personal details or user profiles for topic generation. If topic history is retained, keep it to the minimum topic metadata required by the application.

## 12. Output and user experience
Return the application's existing JSON schema. Do not change field names unless the application code is updated too.

The content should generally include:
- One short topic question.
- Category and difficulty.
- Context of no more than two short sentences.
- Two brief points supporting one side.
- Two brief points supporting the other side.
- Two or three optional thinking prompts.
- Source titles, URLs and dates when current news is used.

Do not show a long article or complete speech by default. The main screen should focus on one topic and the speaking timer. Put extra context and debate guidance behind an optional control.

## 13. Final instruction
Generate ONE topic at a time. Use RAG to understand the selected subject and retrieve factual background. Use live news search when the user asks for latest news or worldwide current affairs and that capability is available.

Do not copy stored examples or produce generic questions. Find a real issue, turn it into a short and fair question, and make the student want to think.

The goal is not to make students sound like professors. Help them speak clearly, think independently, understand current events and express a balanced opinion in simple English.
