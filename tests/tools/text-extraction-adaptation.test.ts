import { describe,it,expect,vi,beforeEach } from 'vitest';
import { extractTextTool, handleExtractText } from '../../src/tools/text-extraction.js';
const getFirefox=vi.hoisted(()=>vi.fn());
vi.mock('../../src/index.js',()=>({getFirefox}));
describe('Firewatch scoped text extraction adaptation',()=>{
  beforeEach(()=>getFirefox.mockReset());
  it('registers a bounded read-only tool',()=>{
    expect(extractTextTool.name).toBe('extract_text');
    expect(extractTextTool.annotations.readOnlyHint).toBe(true);
  });
  it('rejects invalid length and scope without touching the browser',async()=>{
    for(const args of [{maxLength:0},{maxLength:20001},{maxLength:1.5},{scope:'none'},{scope:'selector'},{scope:'uid'}]){
      const r=await handleExtractText(args);
      expect(r.isError).toBe(true);
    }
    expect(getFirefox).not.toHaveBeenCalled();
  });
  it('extracts rendered page text and preserves typed script arguments',async()=>{
    const sendBiDiCommand=vi.fn().mockResolvedValue({type:'success',result:{type:'string',value:'Readable text'}});
    getFirefox.mockResolvedValue({getCurrentContextId:()=> 'ctx',sendBiDiCommand});
    const r=await handleExtractText({scope:'page'});
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain('Readable text');
    expect(sendBiDiCommand).toHaveBeenCalledWith('script.callFunction',expect.objectContaining({
      target:{context:'ctx'},arguments:expect.arrayContaining([{type:'string',value:'page'}]),
    }));
  });
  it('passes selector data as an argument and truncates output',async()=>{
    const sendBiDiCommand=vi.fn().mockResolvedValue({type:'success',result:{type:'string',value:'abcd'}});
    getFirefox.mockResolvedValue({getCurrentContextId:()=> 'ctx',sendBiDiCommand});
    const r=await handleExtractText({scope:'selector',selector:'main',source:'dom',maxLength:2});
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain('ab\n\n[... truncated]');
    expect(sendBiDiCommand.mock.calls[0][1].arguments[1]).toEqual({type:'string',value:'main'});
  });
  it('uses snapshot UID element reference rather than injecting UID strings',async()=>{
    const sendBiDiCommand=vi.fn().mockResolvedValue({type:'success',result:{type:'string',value:'A'}});
    const resolveUidToElement=vi.fn().mockResolvedValue({sharedId:'a-ref'});
    getFirefox.mockResolvedValue({getCurrentContextId:()=> 'ctx',resolveUidToElement,sendBiDiCommand});
    const r=await handleExtractText({scope:'uid',uid:'a12'});
    expect(r.isError).toBeUndefined();
    expect(resolveUidToElement).toHaveBeenCalledWith('a12');
    expect(sendBiDiCommand.mock.calls[0][1].arguments[3]).toEqual({sharedId:'a-ref'});
  });
  it('propagates Firefox script exceptions',async()=>{
    getFirefox.mockResolvedValue({getCurrentContextId:()=> 'ctx',sendBiDiCommand:vi.fn().mockResolvedValue({
      type:'exception',exceptionDetails:{text:'Missing element'},
    })});
    const r=await handleExtractText({});
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain('Missing element');
  });
});
