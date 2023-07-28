import markdown

html = open("src/index_base.html").read()
readme = open("src/readme_base.md").read()

md = open("src/index.md").read()

html = html.replace("{%index.md%}", markdown.markdown(md))
readme = readme.replace("{%index.md%}", md)

open("index.html", 'wb').write(bytearray(html, 'utf-8'))
open("README.md", 'wb').write(bytearray(readme, 'utf-8'))
