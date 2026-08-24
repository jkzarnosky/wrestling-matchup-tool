# Weekly Wrestling Matchup Tool — Requirements Doc

## 1. Problem Statement

- The goal of this system is to support a youth recreational wrestling league. The league consists of two conferences with multiple teams.
- The first goal is data entry. Each team needs to be able to input and update the data for their wrestlers.
  -Each team has wrestlers from 4 - 13 years old. 
    - Key data points for each wrestler includes: 
    - Skill level (4 = first year, 3 = experienced, 2 = competitive, 1 = expert)
    - Sex
    - Birthday (age)
    - Weight
    - Age bracket
      - Tots - 4-6 yo
      - Bantams - 7-8 yo
      - Midget - 9-10 yo
      - Junior - 11-12 yo
      - Intermediate - 13 yo
  - History should be kept of all changes. IE Wrestler listed at weight A but changed to B for championships.
- The second goal is to be able to easily make matchups for weekly matches.
  - Based on the teams participating (2-4), match up the wrestlers based on the following criteria.
    - Allowable age difference. +- how many years?
    - Allowable skill difference. +- how many skill levels?
    - Allowable weigh difference. +- How many pounds? - Change to a %? 
    - Number of mats available. 
  - Create a printable copy of the matchups.
  - Hosting team is usually responsible for the matchups. This is not a hard rule so we dont need to input a schedule or anything. Maybe each team has a UI for their made matchups?
  - Host the matchups on a website.
  - Add functionality to challenge wrestlers weight or experience.
- The third goal is to support a championship. 
  - There can be qualifiers - one per conference.
  - Then there is a championship for all of the teams.
  - Each team is allowed to send two wrestlers per division. No tots.
  - Top 4 placers from each qualifer goes to the championships. 1 faces 4 seed, etc. 
- The fourth goal is to support a 'tot-o-rama' tournament. This is a match where all of the tots in the league go for a small tournament. Results are not logged. It is an end of year tournament for the youngest.
  - There are usually 5 mats, but may vary. 
  - Match up considerations are the same considerations as the weekly matchups.
  - With this matchup type, it is preferable to group teams so coaches dont have to stray too far between mats. But if there are wrestlers who have outlying statistics, it is more important they get matchups. 


## 2. Current State
*Describe today's process end to end, so we know what we're replacing or improving.*

- **Data source:** Today the data is input into google sheets by each team. There is a tab per age division with columns for name, birthday, weight, and experience. There are separate tabs to input wrestlers for championships. 
- **Algorithm:** Not 100% on where the logic lives but its in a separate tool that uses the google sheets. The hosting team talks to the other teams to make sure their data is up to date then makes the matchups by inputting the criterea. 
- **Inputs it uses today:** see details in data model, functional requirements.  
- **Manual steps around it:** Data entry is done by each team manually. Matchups are then run manually and output to spreadsheet. 
- **Frequency:** Input is done and available to update through out the season. Matchups are done later in the week before the matches on Fri or the weekend. The qualifiers and championship is end of the season. 

## 2.1 Challenges
- Teams arent honest with weight or experience. 
- Being able to update data and re-export matchups at the event is not easily done through the system. Sometimes kids dont make matchups or have the wrong data. Scratches and adjustments are done on the fly, manually. 
- Allowing for individual exceptions in match making. 
    - IE heavyweights can have a larger weight differential. 
    - Individual kids who dont have experience but are tough and want to wrestle any experience.
    - (Usually larger kids) who will wrestle older kids to get a match.
- Challenges finding outliers matchups - too experiences, too small, too big. 

## 3. Users
*Who actually touches this tool, and what does each of them need from it?*

| User | Role | What they need |
|---|---|---|
| Board Member/Admin | Read Write on all data. Input and maintain users. | View to all data, inclusing change history |
| Team Reps | Owns the data entry for their team. Makes matchups each week when hosting. | UI to add and update data. UI to set criteria, make and evaluate matchups.|
| Parents | parent | want to see the matchups each match |

## 4. Goals / Success Criteria

- Data entry is smoother than google sheets
- User admin is a efficent system. 
- Match making is easy, quick, accounts for exceptions and available via mobile for on the spot updates.
- Qualifier, Championship and Tot-o-rama events are all done through the system. 

## 5. Data Model — What We Know About Each Wrestler

- Key data points for each wrestler includes: 
    - Team 
    Skill level (4 = first year, 3 = experienced, 2 = competitive, 1 = expert)
    - Sex
    - Birthday (age)
    - Weight
    - Age bracket
      - Tots - 4-6 yo
      - Bantams - 7-8 yo
      - Midget - 9-10 yo
      - Junior - 11-12 yo
      - Intermediate - 13 yo
    - Week to week availability (known scratches)
  - History should be kept of all changes. IE Wrestler listed at weight A but changed to B for championships.

## 6. Functional Requirements
*What must the tool actually do? Number these so we can prioritize/reference them later.*

- **Must have:**
  1. Admin functionality
  2. Data input for each team
  3. Weekly Match Making
- **Nice to have:**
  1. Qualifier/Championship
  2. Tot-o-rama
- **Explicitly out of scope (for now):**
  1.TBD

## 7. Edge Cases & Constraints
*Every scheduling tool lives or dies on the edge cases. Think through:*
- No same-club/rematch-too-often rules
- Injuries / no-shows / late scratches
- Highlighting when intra-team matchups are necessary
- Allowing for individual exceptions in match making. 
    - IE heavyweights can have a larger weight differential. 
    - Individual kids who dont have experience but are tough and want to wrestle any experience.
    - (Usually larger kids) who will wrestle older kids to get a match.
- Challenges finding outliers matchups - too experiences, too small, too big. 


## 8. Scale
- Wrestlers per week/roster: 30-100 wrestlers per team
- Clubs involved (single club vs. multi-club duals): 20 teams
- Matchups generated per week: 10

## 9. Workflow / How It Fits Into a Week

- Teams enter their wrestler data at the beginning of the season and update as weights and skills change. 
- Matchups are discussed through the week. The hosting coach contacts the visiting coaches asking them to have their data updated, including known scratches, by a certain day/time, usually Thur morning. The hosting coach then makes the matchups and sends them a copy via email and has print outs for the coaches at the match. 
