const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getCourseGroups, matchesGroups, parseGroupSelection } = require('../utils/CourseGroups');

test('recognizes group spellings present in Sorbonne calendars', () => {
    for (const [summary, groups] of [
        ['UM4IN500-ALGAV-TD1', { TD: ['1'] }],
        ['MU4IN400-PSCR-TD-Gpe2', { TD: ['2'] }],
        ['MU4IN400-PSCR-TME2-Gpe2', { TME: ['2'] }],
        ['UM4IN500-ALGAV-TME2 et 3', { TME: ['2', '3'] }],
        ['UM4IN511-OUV-TD (groupe 1 et 2)', { TD: ['1', '2'] }],
        ['UM4IN500-ALGAV-TD1&2', { TD: ['1', '2'] }],
        ['UM4IN500-ALGAV-TD/TME2', { TD: ['2'], TME: ['2'] }],
        ['UM4IN500-ALGAV-TP 02', { TP: ['2'] }],
        ['ANNULE-UM4IN500-ALGAV-TD2 (rattrapage du 03/04)', { TD: ['2'] }],
        ['UM4IN500-ALGAV-TD10', { TD: ['10'] }],
        ['UM4IN500-ALGAV-TME5(rattrapage du 16/10)', { TME: ['5'] }],
        ['UM4IN500-ALGAV-CM', {}],
        ['UM4IN500-ALGAV-EXAMEN', {}],
        ['MU4IN403-AR-TD (n°7)', {}],
        ['MU4IN403-AR-TD (report du 03/04)', {}],
        ['MU4IN403-AR-TD', {}],
        ['UM4IN500-ALGAV-ATTENTION TDABC2', {}],
        ['', {}],
    ]) assert.deepEqual(getCourseGroups(summary), groups, summary);
});

test('filters each session type independently and keeps common sessions', () => {
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD2', { TD: '1' }), false);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD10', { TD: '1' }), false);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD1', { TD: '1' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TME2 et 3', { TME: '3' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD (groupe 1 et 2)', { TD: '2' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TME2', { TD: '1' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-CM', { TD: '1', TME: '2' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD', { TD: '1' }), true);
    assert.equal(matchesGroups('UM4IN500-ALGAV-TD2'), true);
});

test('rejects malformed group parameters and groups for unselected courses', () => {
    for (const input of ['', 'null', '[]', '{}junk', [], {}, '{"OTHER":{"TD":"1"}}',
        '{"UM4IN500":{"CM":"1"}}', '{"UM4IN500":{"TD":1}}', '{"UM4IN500":{"TD":"1x"}}',
        '{"UM4IN500":{"TD":"01"}}', '{"UM4IN500":[]}', '{"__proto__":{"TD":"1"}}']) {
        assert.throws(() => parseGroupSelection(input, ['UM4IN500']));
    }
    assert.deepEqual(parseGroupSelection(undefined, []), {});
    assert.equal(parseGroupSelection('{"UM4IN500":{"TD":"2"}}', ['UM4IN500']).UM4IN500.TD, '2');
});
