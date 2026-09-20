"""Exercise actual gallery functions offline, without a Home Assistant runtime."""
import ast
import asyncio
import math
import re
from pathlib import Path
from urllib.parse import urlencode

source = Path(__file__).resolve().parents[1] / 'custom_components/theme_studio/gallery.py'
tree = ast.parse(source.read_text(encoding='utf-8-sig'))
nodes = [ast.ImportFrom(module='__future__', names=[ast.alias(name='annotations')], level=0)]
nodes += [n for n in tree.body if isinstance(n, (ast.Assign, ast.AnnAssign, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))]
env = {'re': re, 'math': math, 'urlencode': urlencode, 'GALLERY_DOWNLOAD_URL': 'https://example.invalid/download'}
exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), str(source), 'exec'), env)
public_id = '12345678-1234-4234-8234-123456789abc'

async def check():
    for mode in ('light', 'dark'):
        item = env['_normalize_gallery_item']({'id':public_id, 'title':'Mint', 'preview':{
            'mode':mode, 'modes':{mode:{'primary':'#7ac143'}}}})
        assert item['preview']['mode'] == mode
        assert list(item['preview']['modes']) == [mode]
        assert item['preview']['modes'][mode]['primary'] == '#7ac143'
        profile = {'format':'theme-studio-profile','version':2,'name':'Mint',
                   'settings':{'mode':mode,'design':{'primaryColor':'#7ac143'}}}
        async def fake_download(*args):
            return profile
        env['_async_get_json'] = fake_download
        assert await env['async_download_gallery_profile'](None, public_id) == profile
        for invalid in ('auto', None, [], 1):
            profile['settings']['mode'] = invalid
            try:
                await env['async_download_gallery_profile'](None, public_id)
            except env['GalleryError']:
                pass
            else:
                raise AssertionError('Invalid mode accepted')
        profile['settings']['mode'] = mode
        for version in ('2', True, 3):
            profile['version'] = version
            try:
                await env['async_download_gallery_profile'](None, public_id)
            except env['GalleryError']:
                pass
            else:
                raise AssertionError('Invalid version accepted')
    legacy = env['_normalize_gallery_item']({'id':public_id, 'title':'Legacy'})
    assert set(legacy['preview']['modes']) == {'light','dark'}
    light = env['_normalize_gallery_item']({'id':public_id, 'title':'Light', 'category':'Hell',
                                            'preview':{'modes':{'light':{'primary':'#abcdef'},'dark':{'primary':'#111111'}}}})
    assert light['preview']['mode'] == 'light'
    assert list(light['preview']['modes']) == ['light']
    assert light['preview']['modes']['light']['primary'] == '#abcdef'
    dark = env['_normalize_gallery_item']({'id':public_id, 'title':'Dark', 'category':'Dunkel',
                                           'preview':{'modes':{'light':{'primary':'#abcdef'},'dark':{'primary':'#111111'}}}})
    assert dark['preview']['mode'] == 'dark'
    assert list(dark['preview']['modes']) == ['dark']
    assert dark['preview']['modes']['dark']['primary'] == '#111111'

asyncio.run(check())
print('Gallery checks passed: fixed/category modes, exact colors, v2 download, malformed input rejection, legacy previews.')
