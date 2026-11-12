"""Render the page-text atlas (2 x 2 book pages) with Blender text objects -> build/tex/pages.png.

Usage: blender -b --factory-startup -P tools/make_textures.py
Atlas is 1400 x 2048 px; each cell is one page (0.7 x 1.024 units, aspect ~ 0.68 = page aspect).
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scene"))
import common as C  # noqa: E402

FONT = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"

PAGES = [
    ("THE WHALE WHO READ THE MOON", "I",
     "Long before the sea had a name, a young whale rose each night to the surface to read. "
     "The moon wrote on the water in silver, and the whale read every line, though the waves "
     "kept turning the pages too soon. \"Why do you read what you cannot keep?\" asked the old "
     "turtle, who had carried the same stone on his back for a hundred years. The whale did not "
     "answer. She only listened to the light, and swam a little higher every night, until the "
     "fishermen said she had learned to breathe the sky. When the tide went out at last, the "
     "turtle found a single word left on the sand, and he carried it home instead of his stone.", 17),
    ("THE LIBRARY AT NIGHT", "II",
     "When the last reader leaves and the lamps are turned low, the books begin to listen. "
     "They hear the wind count the windows, one by one, and the moon lean against the glass. "
     "A page that has been read too often grows light, and a light page dreams of flying. "
     "So it was with the oldest fable on the long table: it had been opened ten thousand times, "
     "and each reader had left a little breath between its lines. On the night of the high wind "
     "the breath remembered itself. The page lifted, curled like a wave, and went to find the others, "
     "and the others, it turned out, had been waiting for someone to go first.", 18),
    ("THE PAPER SEA", "III",
     "Ten thousand pages make a river, and a river that is patient becomes a sea. "
     "They flew over the reading desks and under the arches, past the sleeping chairs, "
     "turning in the blue light like fish that have forgotten the water. No page knew the "
     "shape it was making; each one only followed the page ahead, and kept a little distance "
     "from the page beside it. That is all a flock has ever known. Yet from the gallery, where "
     "the moon stood watching, the shape was plain to see: a great back rising, a long fin "
     "opening like a wing, and a tail that slowly, carefully, began to swim.", 19),
    ("MORAL", "IV",
     "What is read with care is never lost; it only waits to be gathered. A single story is a "
     "leaf in the wind, but stories that remember one another become a living thing, larger "
     "than any of the hands that wrote them. Be gentle, then, with the books on the long table. "
     "Turn their pages slowly, and leave a little breath between the lines. Some night, when the "
     "wind is high and the moon is low against the glass, they may decide to take flight, and "
     "you will want them to remember the way home. They always do. In the morning the shelves "
     "are full again, and only the dust on the windowsill knows where they have been.", 20),
]


def text(body, x, y, size, width, font, align="JUSTIFY", spacing=1.32):
    cu = bpy.data.curves.new("t", "FONT")
    cu.body = body
    cu.font = font
    cu.size = size
    cu.align_x = align
    cu.space_line = spacing
    cu.text_boxes[0].width = width
    ob = bpy.data.objects.new("t", cu)
    ob.location = (x, y, 0)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(INK)
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.render.resolution_x, sc.render.resolution_y = 1400, 2048
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
sc.eevee.taa_render_samples = 16
w = bpy.data.worlds.new("w")
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
sc.world = w
INK = C.mat("ink", "#000000", 1.0)
INK.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.0
font = bpy.data.fonts.load(FONT)
font_i = bpy.data.fonts.load(FONT_I)

for idx, (title, num, body, pno) in enumerate(PAGES):
    c, r = idx % 2, idx // 2
    x0, top = c * 0.7, (r + 1) * 1.024
    text(title, x0 + 0.35, top - 0.075, 0.025, 0.0, font, align="CENTER")
    text(num, x0 + 0.35, top - 0.12, 0.03, 0.0, font_i, align="CENTER")
    text(body, x0 + 0.075, top - 0.2, 0.034, 0.55, font, spacing=1.28)
    text(str(pno), x0 + 0.35, top - 0.975, 0.02, 0.0, font, align="CENTER")

bpy.ops.object.camera_add(location=(0.7, 1.024, 5))
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 2.048
sc.camera = cam
os.makedirs(C.TEX, exist_ok=True)
sc.render.filepath = os.path.join(C.TEX, "pages.png")
bpy.ops.render.render(write_still=True)
print("[tex] wrote", sc.render.filepath)
