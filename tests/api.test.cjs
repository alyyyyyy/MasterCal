const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const ICAL = require('ical.js');
const { DatabaseIndexer } = require('../databaseindexer');
const { MasterCalAPIController } = require('../controllers/mastercalapi.controller');

test('calendar API and group discovery', async t => {
    const originalCwd = process.cwd();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mastercal-test-'));
    fs.mkdirSync(path.join(directory, 'calendars'));
    const summaries = ['UM4IN500-ALGAV-CM', 'UM4IN500-ALGAV-TD1', 'UM4IN500-ALGAV-TD2',
        'UM4IN500-ALGAV-TD10', 'UM4IN500-ALGAV-TME1', 'UM4IN500-ALGAV-TME2 et 3',
        'UM4IN500-ALGAV-TD', 'UM4IN500-ALGAV-EXAMEN', 'UM4IN501-DLP-TD2', 'Welcome'];
    const calendar = titles => 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MasterCal Tests//EN\r\n' + titles.map((title, i) =>
        `BEGIN:VEVENT\r\nUID:event-${i}\r\nDTSTAMP:20260901T080000Z\r\nDTSTART:20261001T080000Z\r\nDTEND:20261001T100000Z\r\nSUMMARY:${title}\r\nEND:VEVENT\r\n`).join('') + 'END:VCALENDAR\r\n';
    fs.writeFileSync(path.join(directory, 'calendars/M1_STL.ics'), calendar(summaries));
    fs.writeFileSync(path.join(directory, 'calendars/M1.ics'), calendar(['General meeting']));
    fs.writeFileSync(path.join(directory, 'calendars/M1_SFPN-AFTI.ics'), calendar(['Alternance course']));
    DatabaseIndexer.index = { UM4IN500: 'M1_STL', UM4IN501: 'M1_STL' };
    process.chdir(directory);
    const app = express();
    app.use('/api', MasterCalAPIController);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        process.chdir(originalCwd);
        fs.rmSync(directory, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = query => fetch(`${base}?${query}`);
    const events = async response => {
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/calendar/);
        return new ICAL.Component(ICAL.parse(await response.text())).getAllSubcomponents('vevent').map(e => e.getFirstPropertyValue('summary'));
    };
    await t.test('discovers and numerically sorts groups per course', async () => {
        const response = await fetch(`${base}/groups?courses=um4in500,UM4IN501`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { UM4IN500: { TD: ['1', '2', '10'], TME: ['1', '2', '3'] }, UM4IN501: { TD: ['2'] } });
    });
    await t.test('old URLs return every selected-course event', async () => {
        assert.deepEqual(await events(await request('specialty=NOSPEC&courses=UM4IN500')), summaries.slice(0, 8));
    });
    await t.test('selects groups independently per UE and preserves common events', async () => {
        const groups = encodeURIComponent(JSON.stringify({ UM4IN500: { TD: '1', TME: '3' }, UM4IN501: { TD: '2' } }));
        const titles = await events(await request(`specialty=M1_STL&courses=UM4IN500,UM4IN501&groups=${groups}`));
        assert.deepEqual(titles, [summaries[0], summaries[1], summaries[5], summaries[6], summaries[7], summaries[8], 'General meeting', 'Welcome']);
    });
    await t.test('alternance stays unchanged', async () => {
        assert.deepEqual(await events(await request('specialty=M1_SFPN-AFTI')), ['General meeting', 'Alternance course']);
    });
    await t.test('invalid requests return 400 instead of a server error', async () => {
        for (const query of ['specialty[]=NOSPEC', 'specialty=NOSPEC&courses[]=UM4IN500',
            'specialty=NOSPEC&courses=UNKNOWN', 'specialty=NOSPEC&courses=UM4IN500&groups=null',
            'specialty=NOSPEC&courses=UM4IN500&groups[]=1', 'specialty=NOSPEC&groups=%7B%22UM4IN500%22%3A%7B%22TD%22%3A%221%22%7D%7D']) {
            assert.equal((await request(query)).status, 400, query);
        }
        for (const query of ['', '?courses=UNKNOWN', '?courses[]=UM4IN500', '?courses=__proto__']) {
            assert.equal((await fetch(`${base}/groups${query}`)).status, 400);
        }
    });
});
