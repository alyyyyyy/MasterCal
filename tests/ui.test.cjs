const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const settle = () => new Promise(resolve => setImmediate(resolve));

test('group menus generate a per-course URL and recover from loading failures', async t => {
    let fail = true;
    const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
        url: 'http://localhost:5001', runScripts: 'dangerously',
        beforeParse(window) {
            window.matchMedia = () => ({ matches: false });
            window.fetch = async url => {
                const course = new URL(url, window.location.origin).searchParams.get('courses');
                if (course === 'UM4IN501' && fail) throw new Error('offline');
                return { ok: true, json: async () => ({ [course]: course === 'UM4IN501' ? {} : { TD: ['1', '2'], TME: ['1', '2', '3'] } }) };
            };
        }
    });
    t.after(() => dom.window.close());
    const { document, Event } = dom.window;
    await new Promise(resolve => dom.window.addEventListener('load', resolve));
    const change = (id, value) => {
        const input = document.getElementById(id);
        input.checked = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const link = () => new URL(document.getElementById('link').value);
    assert.equal(document.querySelector('.courses-fieldset').disabled, true);
    assert.equal(document.getElementById('link').readOnly, true);
    change('M1_STL', true);
    change('UM4IN500', true);
    await settle();
    const row = document.getElementById('UM4IN500').parentElement;
    assert.equal(row.querySelectorAll('select').length, 2);
    assert.equal(link().searchParams.has('groups'), false);
    const select = row.querySelector('[data-type="TD"]');
    select.value = '2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(JSON.parse(link().searchParams.get('groups')), { UM4IN500: { TD: '2' } });
    const tme = row.querySelector('[data-type="TME"]');
    tme.value = '3';
    tme.dispatchEvent(new Event('change', { bubbles: true }));
    assert.deepEqual(JSON.parse(link().searchParams.get('groups')), { UM4IN500: { TD: '2', TME: '3' } });
    change('UM4IN500', false);
    assert.equal(row.querySelector('.group-options').hidden, true);
    assert.equal(link().searchParams.has('groups'), false);
    change('UM4IN500', true);
    assert.equal(select.value, '2');
    change('M1_SFPN-AFTI', true);
    assert.equal(link().searchParams.has('courses'), false);
    assert.equal(link().searchParams.has('groups'), false);
    change('M1_STL', true);
    assert.equal(JSON.parse(link().searchParams.get('groups')).UM4IN500.TD, '2');
    change('UM4IN501', true);
    await settle();
    const otherRow = document.getElementById('UM4IN501').parentElement;
    assert.match(otherRow.textContent, /Groups unavailable/);
    fail = false;
    otherRow.querySelector('button').click();
    await settle();
    assert.match(otherRow.textContent, /No numbered groups detected/);
    assert.equal(JSON.parse(link().searchParams.get('groups')).UM4IN500.TME, '3');
});
