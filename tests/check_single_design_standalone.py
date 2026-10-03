"""Run actual pure backend functions without importing Home Assistant."""
import ast
import asyncio
import base64
import json
import re
import runpy
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# The optional path supplies the already-installed voluptuous package only.
if len(sys.argv) > 1:
    sys.path.append(sys.argv[1])
import voluptuous as vol

helpers = runpy.run_path(str(ROOT / 'custom_components/theme_studio/single_design.py'))
source = ast.parse((ROOT / 'custom_components/theme_studio/websocket.py').read_text(encoding='utf-8-sig'))
nodes = [ast.ImportFrom(module='__future__', names=[ast.alias(name='annotations')], level=0)]
for node in source.body:
    if isinstance(node, (ast.Assign, ast.AnnAssign)):
        nodes.append(node)
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        node.decorator_list = []
        nodes.append(node)
env = {
    'DOMAIN': 'theme_studio',
    'vol': vol,
    'json': json,
    'base64': base64,
    're': re,
    **helpers,
}
exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), '<actual backend functions>', 'exec'), env)
settings = env['default_settings']()
settings['light']['primaryColor'] = '#112233'
settings['dark']['primaryColor'] = '#336611'
glass = deepcopy(env['DEFAULT_DARK_PROFILE'])
glass.update({
    'liquidGlass': True,
    'cardColor': '#ff0000',
    'cardOpacity': 100,
    'glassTransparency': 100,
    'cardBorderWidth': 6,
    'cardShadow': 50,
    'borderRadius': 5,
    'glassBlur': 0,
})
glass = env['normalize_profile'](glass, env['DEFAULT_DARK_PROFILE'])
assert glass['cardColor'] == '#253642' and glass['cardOpacity'] == 0
assert glass['cardBorderWidth'] == 1 and glass['cardShadow'] == 24
assert glass['borderRadius'] == 5 and glass['glassBlur'] == 0
assert env['build_mode_values'](glass, 'dark')['ha-card-background'] == (
    'rgba(37, 54, 66, 0.00)'
)
profiles = [{'id':f'{i:032x}', 'name':f'Theme {i}', 'settings':deepcopy(settings)} for i in range(32)]
before = deepcopy(profiles)
split = helpers['split_profiles'](profiles)
assert len(split) == 64 and len({p['id'] for p in split}) == 64
assert profiles == before
assert helpers['split_profiles'](split) == split
assert helpers['split_profiles'](profiles) == split
for p in split:
    mode = p['settings']['mode']
    assert p['settings'][mode] == settings[mode]
    assert p['settings']['light'] == p['settings']['dark']
    normalized = env['normalize_settings'](p['settings'])
    assert normalized == p['settings']
    yaml = env['build_theme_file'](normalized)
    assert f'    {mode}:' in yaml
    assert f'    {"dark" if mode == "light" else "light"}:' not in yaml
    portable, _ = env['portable_import_settings'](normalized)
    exported = {'mode':mode, 'design':portable[mode]}
    assert env['normalize_settings'](exported)[mode] == portable[mode]
try:
    env['normalize_settings']({'mode':'auto','design':settings['light']})
    raise AssertionError('invalid mode accepted')
except vol.Invalid:
    pass
expert = env['default_settings']()
expert_css = 'ha-card[data-theme-studio-id="energy"] { margin: 0 !important; }'
expert['effects']['expertCssEnabled'] = True
expert['effects']['expertCss'] = expert_css
expert['effects']['expertRules'] = [{
    'id': '0123456789ab', 'name': 'Compact energy', 'enabled': True,
    'targetType': 'entity', 'target': 'sensor.house_power', 'device': 'mobile',
    'margin': 0, 'padding': 6, 'gap': None, 'width': None, 'minHeight': 80,
    'columns': 2, 'offsetX': None, 'offsetY': -3, 'opacity': 95,
    'fontSize': 14, 'borderRadius': 4,
}, {
    'id': 'abcdef012345', 'name': 'One dashboard card', 'enabled': True,
    'targetType': 'card', 'target': '0123456789abcdef', 'device': 'all',
    'margin': 2, 'padding': None, 'gap': None, 'width': None,
    'minHeight': None, 'columns': None, 'offsetX': None, 'offsetY': None,
    'opacity': None, 'fontSize': None, 'borderRadius': None,
}]
expert = env['normalize_settings'](expert)
expert_yaml = env['build_theme_file'](expert)
generated_css = env['build_expert_rules_css'](expert['effects']['expertRules'])
combined_css = f'{generated_css}\n\n{expert_css}'
encoded_css = base64.b64encode(combined_css.encode('utf-8')).decode('ascii')
assert f'theme-studio-expert-css-b64: "{encoded_css}"' in expert_yaml
assert expert_css not in expert_yaml
assert '@media (max-width: 600px)' in generated_css
assert 'grid-column: span 2 !important' in generated_css
assert 'data-theme-studio-card-key="0123456789abcdef"' in generated_css
assert '--state-card-primary-font-size: 14px !important' in generated_css
for unsafe_css in ('@import "https://example.invalid/a.css";',
                   'ha-card { background: url(data:image/png;base64,AAAA); }'):
    candidate = deepcopy(expert['effects'])
    candidate['expertCss'] = unsafe_css
    try:
        env['normalize_effects'](candidate)
        raise AssertionError('unsafe expert CSS accepted')
    except vol.Invalid:
        pass
print('Backend checks passed: 32 -> 64 lossless profiles, stable IDs, repeat migration, isolated palettes, single-mode YAML, v2 roundtrip, invalid mode.')

class MemoryStore:
    def __init__(self, value=None): self.value = deepcopy(value)
    async def async_load(self): return deepcopy(self.value)
    async def async_save(self, value): self.value = deepcopy(value)

async def check_migration_storage():
    primary = MemoryStore({'profiles': profiles})
    backup = MemoryStore()
    env['get_profile_store'] = lambda hass: primary
    env['Store'] = lambda *args: backup
    loaded = await env['async_load_profiles'](None)
    assert len(loaded) == 64
    assert primary.value == {'profiles':profiles}, 'Reading must not write migration'
    await env['async_save_profiles'](None, loaded)
    assert backup.value == {'profiles':profiles}
    assert await env['async_load_profiles'](None) == loaded
    await env['async_save_profiles'](None, loaded[:-1])
    assert backup.value == {'profiles':profiles}, 'Original backup must not be overwritten'
    assert len(await env['async_load_profiles'](None)) == 63, 'Deleted variant must not reappear'
asyncio.run(check_migration_storage())
print('Storage checks passed: no write on read, original backup, migration persisted, deletion remains deleted.')
