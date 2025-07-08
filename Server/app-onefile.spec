# -*- mode: python ; coding: utf-8 -*-

hiddenimports = [
    #dist utils for numba in bayesian
    #'numpy.distutils', 
    #'numpy.distutils.ccompiler', 
    #'numpy.distutils.log', 
    #'numpy.distutils.npy_pkg_config', 
    #'numpy.distutils.unixccompiler', 
    #'distutils', 
    #'distutils.command', 
    #'distutils.command.build', 
    #'distutils.unixccompiler', 
    'pyarrow._csv', 
    'sklearn.utils._cython_blas',
    'sklearn.neighbors.typedefs',
    'sklearn.neighbors.quad_tree',
    'sklearn.tree._utils',
    'sklearn.neighbors._typedefs',
    'sklearn.utils._weight_vector',
    'sklearn.neighbors._quad_tree',
    'ai_analyzer',
    'ai_analyzer.profile',
    'ai_analyzer.lib.sample',
    'ai_analyzer.lib.kde',
    'ai_analyzer.lib.information',
    'ai_analyzer.lib.stats',
    'ai_analyzer.lib.trie',
    'ai_analyzer.lib.miner_cpp_bridge',
    'ai_analyzer.license',
    'ai_analyzer.license.validate_key'
]

block_cipher = None


a = Analysis(['app.py'],
             pathex=['C:\\Users\\dariu\\OneDrive\\Desktop\\ai-analyst\\WebApp\\Server'],
             binaries=[],
             datas=[
                 ('..\\..\\ai_analyzer\\license\\license.txt', 'ai_analyzer\\license'),
                 ('..\\..\\env\\lib\\site-packages\\numba\\cext', 'numba\\cext'),
                 ('..\\..\\env\\lib\\site-packages\\numpy\\core\\lib', 'numpy\\core\\lib'),
                ],
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
          a.binaries,
          a.zipfiles,
          a.datas,  
          [],
          name='app',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir=None,
          console=True,
          disable_windowed_traceback=False,
          target_arch=None,
          codesign_identity=None,
          entitlements_file=None )
