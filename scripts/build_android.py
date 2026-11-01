"""Build with the inherited cloud proxy; no credentials are read or saved."""
import os, pathlib, subprocess, urllib.parse
root = pathlib.Path(__file__).resolve().parent.parent
settings = os.environ.copy()
if not settings.get('ANDROID_HOME') and pathlib.Path('/workspace/android-sdk').exists():
    settings['ANDROID_HOME'] = '/workspace/android-sdk'
if pathlib.Path('/workspace/jdk-21/bin/javac').exists():
    settings['JAVA_HOME'] = '/workspace/jdk-21'
settings.setdefault('GRADLE_USER_HOME', '/workspace/.gradle')
args = ['./gradlew', '--no-daemon', '--max-workers=2']
proxy = urllib.parse.urlsplit(settings.get('HTTPS_PROXY', ''))
if proxy.hostname and proxy.port:
    for scheme in ('http', 'https'):
        args += [f'-D{scheme}.proxyHost={proxy.hostname}', f'-D{scheme}.proxyPort={proxy.port}']
if pathlib.Path('/etc/ssl/certs/java/cacerts').exists():
    args += ['-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts']
args += ['assembleDebug']
raise SystemExit(subprocess.call(args, cwd=root / 'android', env=settings))
