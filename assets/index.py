import markdown
import datetime

html = open("assets/index_base.html").read()
readme = open("assets/readme_base.md").read()

md = open("assets/index.md").read()
# md = '\n'.join([line for line in md.split('\n') if not line.startswith('[//]')])

html = html.replace("{%index.md%}", markdown.markdown(md))
html = html.replace('../assets', './assets')
readme = readme.replace("{%index.md%}", md)

now = datetime.datetime.now()
date = f'{now.strftime("%B")} {now.year}'
html = html.replace("{%date%}", date)
readme = readme.replace("{%date%}", date)

open("index.html", 'wb').write(bytearray(html, 'utf-8'))
open("README.md", 'wb').write(bytearray(readme, 'utf-8'))
