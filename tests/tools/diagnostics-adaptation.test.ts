import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectBinary,which,nodeSupported,diagnoseFirefoxTool} from '../../src/tools/diagnostics.js';
describe('Firefox environment diagnostics adapted from forked troubleshooting plugin',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ff-doctor-'));
 const native=path.join(root,'firefox-native');
 const wrapper=path.join(root,'firefox-wrapper');
 fs.writeFileSync(native,Buffer.from([0x7f,0x45,0x4c,0x46,0x00]));
 fs.writeFileSync(wrapper,'#!/bin/sh\nexec /snap/bin/firefox "$@"\n');
 it('recognizes real ELF Firefox binaries',()=>expect(inspectBinary(native).kind).toBe('native'));
 it('recognizes shell wrappers that Selenium cannot use as binaries',()=>expect(inspectBinary(wrapper).kind).toBe('wrapper'));
 it('reports missing paths without writing',()=>expect(inspectBinary(path.join(root,'none')).kind).toBe('missing'));
 it('resolves executable from a controlled PATH',()=>expect(which('firefox-native',root)).toBe(native));
 it('enforces Node 20.19+ requirement',()=>{
   expect(nodeSupported('20.18.9')).toBe(false);
   expect(nodeSupported('20.19.0')).toBe(true);
   expect(nodeSupported('26.0.0')).toBe(true);
 });
 it('advertises a read-only diagnostic',()=>{
   expect(diagnoseFirefoxTool.name).toBe('diagnose_firefox_environment');
   expect(diagnoseFirefoxTool.annotations.readOnlyHint).toBe(true);
 });
});
