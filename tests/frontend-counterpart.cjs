const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../custom_components/theme_studio/frontend/theme-studio-panel.js'),'utf8');
const start=src.indexOf('  async _newDesign() {'),end=src.indexOf('  get profile()',start);
const fn=new Function('return class {'+src.slice(start,end)+'}')().prototype._newDesign;
(async()=>{
for(const mode of ['light','dark']){
const elements={'new-design-name':{value:'Green Look '+mode},'new-design-mode':{value:mode},'profile-name':{value:''},'new-design-button':{disabled:false}};
let saved;
const p={shadowRoot:{getElementById:id=>elements[id]},_confirm:()=>true,_initialDesignDefaults:{light:{color:'#ffffff'},dark:{color:'#000000'},effects:{}},
_cloneSettings:structuredClone,_replaceEditorSettings(s){this.settings=s},_renderProfileOptions(){},async _saveProfile(){saved=structuredClone(this.settings)}};
await fn.call(p);
assert.equal(saved.mode,mode);assert.deepEqual(saved.light,saved.dark);
assert.equal(saved[mode].color,mode==='light'?'#ffffff':'#000000');
assert.equal(p.activeProfileId,'');assert.equal(elements['new-design-button'].disabled,false);
}
console.log('Native light/dark design creation checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
