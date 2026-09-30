# MasterCal
MasterCal serves personalized iCalendars for CS Masters at Sorbonne University, directly in Google Calendar or your own calendar app.

## Setup
1. Go to [https://mastercal.alias-asso.fr](https://mastercal.alias-asso.fr)
2. Fill in your major and your courses (starting with the major). Under each selected course, choose your TD, TP and/or TME group, or leave **All groups** to include every session. Copy your personal generated link.
3. Open [Google Calendar](https://calendar.google.com/), [Proton Calendar](https://calendar.proton.me/u/0/) or any other calendar app that supports importing and syncing from URL (I will use Google Calendar in the setup)
4. In the upper right corner of your screen, click the gear icon on the left of your Google account profile picture and choose _Settings_
   
   <div align="center">
     <img src="./img/screenshot1.png" width="500px" height="auto">
   </div>
   
6. On the left of your screen, unwrap the _Add calendar_ submenu and click _From URL_
   
   <div align="center">
     <img src="./img/screenshot2.png" width="500px" height="auto">
   </div>

8. Fill in the link you copied and add the calendar. It is going to load for a bit because your app is downloading all the events
9. (Optional: You can customize the name and color of your calendar)
11. ⚠️ Now head to your Google Calendar phone app and open settings
12. ⚠️ Under the Google account you used, click _Show more_. Your new calendar is hidden there. Press the calendar item you just created
13. ⚠️ Finally, press _Sync_ to enable syncing on your phone. Voilà!
        
   <div align="center" display="flex">
     <img src="./img/screenshot3.png" width="300px" height="auto">
     <img src="./img/screenshot4.png" width="300px" height="auto">
   </div>

If you have any comment or if you find a mistake somewhere (wrong course code, duplicate, etc.) please send me a message on Discord! The @ is my Github username. 

## Course groups

Group menus are populated from the downloaded Sorbonne calendars, independently for each course and session type. Selecting TD 1 does not filter TME or TP sessions unless you also choose their groups. Lectures, exams and sessions without an explicit numbered group remain included. Shared sessions such as `TME2 et 3` are included for either group. Alternance calendars retain their existing behavior.

Existing subscription URLs continue to include all groups. After changing your selection, replace your subscription URL in your calendar app; the old subscription cannot pick up changes to its URL automatically.

The optional `groups` query parameter is a URL-encoded JSON object, for example:

```json
{"UM4IN500":{"TD":"1","TME":"2"},"UM4IN501":{"TD":"2"}}
```

Use it with `/api?specialty=M1_STL&courses=UM4IN500,UM4IN501&groups=...`.
`GET /api/groups?courses=UM4IN500,UM4IN501` lists the detected groups. Group numbers are canonical numeric strings. Only selected courses and the session types `TD`, `TP`, `TME` are accepted. A well-formed number remains valid even if it disappears from the source, so subscriptions do not break during calendar updates.

Detection supports explicit numbered labels such as `TD1`, `TD-Gpe2`, `TD (groupe 1 et 2)` and `TME2 et 3`. Unnumbered, ambiguous or unsupported labels are kept rather than silently hiding events; session counters such as `TD (n°7)` are not treated as groups. Group membership is read from event titles, not inferred from locations or teachers.

## Local development

Requires Node.js 22.13+ (Node.js 24 recommended).

```sh
npm ci
npm test
npm run build
npm start
```

Open `http://localhost:5001`. The first startup downloads the university calendars and therefore needs network access. The application refreshes them every two hours. Tests use temporary fixtures and do not need the university service.

This is a Node.js server; GitHub Pages alone cannot host the calendar API. Deploy your fork to a Node.js host to use its generated subscription URLs from a calendar app.
