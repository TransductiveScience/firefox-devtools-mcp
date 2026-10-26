/**
 * Browser setup diagnostic inspired by the independent Mozilla fork:
 * juliandescottes/firefox-devtools-mcp commit 623446fd5 (troubleshooting skill).
 * Here the checks become read-only executable MCP diagnostics. Aimed at failures
 * like the actual Ubuntu Snap shell wrapper that breaks Selenium binary selection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { successResponse } from '../utils/response-helpers.js';
import { defineModule, defineToolHandler, type ToolDefinition } from './module.js';
import type { McpToolResponse } from '../types/common.js';

type BinaryKind = 'native' | 'wrapper' | 'missing' | 'other';
export function inspectBinary(filename: string): { path: string; kind: BinaryKind } {
  try {
    const stat = fs.statSync(filename);
    if (!stat.isFile()) return { path: filename, kind: 'other' };
    const fd = fs.openSync(filename, 'r');
    let header: Buffer;
    try { header = Buffer.alloc(4); fs.readSync(fd, header, 0, 4, 0); }
    finally { fs.closeSync(fd); }
    if (header[0]===0x7f && header.subarray(1).toString('utf8')==='ELF') {
      return { path: filename, kind: 'native' };
    }
    if (header.subarray(0,2).toString('utf8')==='#!') return { path: filename, kind: 'wrapper' };
    return { path: filename, kind: 'other' };
  } catch { return { path: filename, kind: 'missing' }; }
}
export function which(binary:string, envPath:string | undefined=process.env.PATH):string|undefined{
  for(const entry of (envPath||'').split(path.delimiter)){
    if(!entry)continue;
    const p=path.join(entry,binary);
    try { if(fs.statSync(p).isFile()) return p; } catch {}
  }
  return undefined;
}
export function nodeSupported(version:string):boolean{
  const parts=version.split('.').map(Number);
  if(parts.length<3 || !parts.every(Number.isFinite)) return false;
  const [major=0,minor=0,patch=0]=parts;
  return major>20 || (major===20 && (minor>19 || (minor===19&&patch>=0)));
}
export const diagnoseFirefoxTool = {
 name:'diagnose_firefox_environment',
 description:'Read-only Firefox MCP runtime and binary diagnostics; identifies script wrappers and recommends native executable paths without launching the browser.',
 annotations:{readOnlyHint:true},
 inputSchema:{type:'object',properties:{}},
} satisfies ToolDefinition;

export const handleDiagnoseFirefox = defineToolHandler(async (): Promise<McpToolResponse> => {
  const {args}=await import('../index.js');
  const configured=typeof args.firefoxPath==='string' && args.firefoxPath.length>0 ?
     args.firefoxPath : which('firefox') || 'firefox';
  const selected=inspectBinary(configured);
  const actualSnap='/snap/firefox/current/usr/lib/firefox/firefox';
  const alternate=inspectBinary(actualSnap);
  const runtimeOK=nodeSupported(process.versions.node);
  const recommendation=selected.kind==='wrapper' && alternate.kind==='native'
    ? 'Firefox launcher is a shell wrapper. Use --firefoxPath '+actualSnap+' with this local installation.'
    : selected.kind==='native' ? 'Native Firefox executable is configured.' :
      'Inspect the Firefox executable path; it must resolve to a native Firefox binary.';
  const report={
    checker:'Firefox DevTools runtime doctor',
    nodeVersion:process.versions.node,nodeSupported:runtimeOK,
    configuredExecutable:selected.path,executableKind:selected.kind,
    alternativeNativeSnap:alternate.kind==='native' ? actualSnap : null,
    geckodriverPresent:Boolean(which('geckodriver')),
    browserLaunched:false,profileModified:false,
    sourceFork:'juliandescottes/firefox-devtools-mcp',
    sourceCommit:'623446fd5',recommendation,
  };
  return successResponse(JSON.stringify(report,null,2));
});
export const module=defineModule({
 name:'diagnostics',
 description:'Firefox setup checks.',
 tools:[[diagnoseFirefoxTool,handleDiagnoseFirefox]],
});
