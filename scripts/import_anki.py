"""Extract the user's Anki deck without executing its content."""
import sys, zipfile, sqlite3, tempfile, json, pathlib, hashlib
source = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(source) as archive, tempfile.TemporaryDirectory() as temp:
    member = 'collection.anki21' if 'collection.anki21' in archive.namelist() else 'collection.anki2'
    target = pathlib.Path(temp) / 'collection.sqlite'
    target.write_bytes(archive.read(member))
    db = sqlite3.connect(f'file:{target}?mode=ro', uri=True)
    rows = [row[0].split('\x1f') for row in db.execute('select flds from notes order by id')]
    pairs = [{'en':row[0], 'de':row[1]} for row in rows if len(row)>=2]
pathlib.Path('data/source-deck.json').write_text(json.dumps({'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'cards':pairs},ensure_ascii=False,indent=2)+'\n')
