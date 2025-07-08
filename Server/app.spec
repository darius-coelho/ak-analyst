# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from sys import platform
import inspect

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

import PyInstaller.config
from PyInstaller.utils.hooks import collect_submodules
PyInstaller.config.CONF['distpath'] = "../Client/background_tasks"

hiddenimports = [
    'pyarrow._csv',     
    'distutils.unixccompiler',
    'ai_analyzer',
    'ai_analyzer.profile',
    'ai_analyzer.lib.sample',
    'ai_analyzer.lib.sanitize',
    'ai_analyzer.lib.pattern',
    'ai_analyzer.lib.kde',
    'ai_analyzer.lib.information',
    'ai_analyzer.lib.stats',
    'ai_analyzer.lib.trie',
    'ai_analyzer.lib.miner_cpp_bridge',
    'ai_analyzer.lib.algos_cpp_bridge',
    'ai_analyzer.license',
    'ai_analyzer.license.validate_key'
]

hiddenimports += collect_submodules("sklearn", filter=lambda name: 'datasets' not in name)
hiddenimports += collect_submodules("numpy.distutils");

block_cipher = None

datas = [
    ('..\\..\\ai_analyzer\\license\\license.txt', 'ai_analyzer\\license'),
    ('..\\..\\env\\lib\\site-packages\\numba\\cext', 'numba\\cext'),
    ('..\\..\\env\\lib\\site-packages\\numpy\\core\\lib', 'numpy\\core\\lib'),
    ('..\\..\\env\\lib\\site-packages\\distributed\\distributed.yaml', 'distributed'),
    ('..\\..\\env\\lib\\site-packages\\dowhy\\VERSION', 'dowhy'),
    ('data\\sp500_data.csv', 'data'),
    ('data\\patient_health.csv', 'data'),
    ('data\\patient_demographics.csv', 'data'),
    ('data\\benchmarks-returns.csv', 'data'),
    ('data\\funds.csv', 'data'),
]

if platform == 'linux' or platform == 'linux2':
    datas = [
        (currentdir+'/../../ai_analyzer/license/license.txt', 'ai_analyzer/license'),
        (currentdir+'/../../../env/lib/python3.7/site-packages/numba/cext', 'numba/cext'),
        (currentdir+'/../../../env/lib/python3.7/site-packages/numpy/core/lib', 'numpy/core/lib'),
        (currentdir+'/../../../env/lib/python3.7/site-packages/distributed/distributed.yaml', 'distributed'),
        (currentdir+'/../../../env/lib/python3.7/site-packages/dowhy/VERSION', 'dowhy'),
        (currentdir+'/data/sp500_data.csv', 'data'),
        (currentdir+'/data/patient_health.csv', 'data'),
        (currentdir+'/data/patient_demographics.csv', 'data'),
        (currentdir+'/data/benchmarks-returns.csv', 'data'),
        (currentdir+'/data/funds.csv', 'data')        
    ]

if platform == 'darwin':
    datas = [
        (currentdir+'/../../ai_analyzer/license/license.txt', 'ai_analyzer/license'),
        (currentdir+'/../../env/lib/python3.9/site-packages/numba/cext', 'numba/cext'),
        (currentdir+'/../../env/lib/python3.9/site-packages/numpy/core/lib', 'numpy/core/lib'),
        (currentdir+'/../../env/lib/python3.9/site-packages/distributed/distributed.yaml', 'distributed'),
        (currentdir+'/../../env/lib/python3.9/site-packages/dowhy/VERSION', 'dowhy'),
        (currentdir+'/data/sp500_data.csv', 'data'),
        (currentdir+'/data/patient_health.csv', 'data'),
        (currentdir+'/data/patient_demographics.csv', 'data'),
        (currentdir+'/data/benchmarks-returns.csv', 'data'),
        (currentdir+'/data/funds.csv', 'data')       
    ]

a = Analysis(['app.py'],
             pathex=[currentdir],
             binaries=[],
             datas=datas,
             hiddenimports=hiddenimports,
             hookspath=[],
             hooksconfig={},
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)

exe = EXE(pyz,
          a.scripts, 
          [],
          exclude_binaries=True,
          name='app',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=True,
          disable_windowed_traceback=False,
          target_arch=None,
          codesign_identity=None,
          entitlements_file=None )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas, 
               strip=False,
               upx=True,
               upx_exclude=[],
               name='app')
