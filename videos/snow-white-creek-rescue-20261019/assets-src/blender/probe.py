import bpy, sys, os, addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True, persistent=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
print("USERDATA", LocationService.get_user_data())
for t in ["hair","eyebrows","eyelashes","clothes","skins","proxymeshes","eyes"]:
    try: print(t, [os.path.basename(p) for p in AssetService.get_asset_list(t)][:40] if hasattr(AssetService,'get_asset_list') else 'n/a')
    except Exception as e: print(t,"ERR",e)
print([m for m in dir(AssetService) if not m.startswith('_')])
