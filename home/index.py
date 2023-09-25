import markdown
import datetime

html = open("home/index_base.html").read()
readme = open("home/readme_base.md").read()

md = open("home/index.md").read()

html = html.replace("{%index.md%}", markdown.markdown(md))
readme = readme.replace("{%index.md%}", md)

now = datetime.datetime.now()
date = f'{now.strftime("%B")} {now.year}'
html = html.replace("{%date%}", date)
readme = readme.replace("{%date%}", date)

open("index.html", 'wb').write(bytearray(html, 'utf-8'))
open("README.md", 'wb').write(bytearray(readme, 'utf-8'))
