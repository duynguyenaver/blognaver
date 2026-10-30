#!/usr/bin/env python3
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('resolver', Path(__file__).with_name('conflict-resolver.py'))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

class ResolverTests(unittest.TestCase):
    def test_insertions_and_deduplication(self):
        self.assertEqual(r.combine(['a\n'], ['h\n','a\n'], ['m\n','a\n']), 'm\nh\na\n')
        self.assertEqual(r.combine(['a\n'], ['x\n','a\n'], ['x\n','a\n']), 'x\na\n')

    def test_refuse_replacement_deletion_markers(self):
        for head in [[], ['b\n'], ['<<<<<<< bad\n','a\n']]:
            with self.assertRaises(ValueError):
                r.combine(['a\n'], head, ['a\n'])

    def test_real_multifile_merge_and_atomic_refusal(self):
        old = os.getcwd()
        with tempfile.TemporaryDirectory() as temp:
            try:
                os.chdir(temp)
                r.git('init', '-b', 'main')
                r.git('config', 'user.email', 'test@example.invalid')
                r.git('config', 'user.name', 'Test')
                files = {'layouts/baseof.html':'a\n</html>\n', 'static/css/article-justified-prose.css':'a\n'}
                for p, text in files.items():
                    Path(p).parent.mkdir(parents=True, exist_ok=True)
                    Path(p).write_text(text)
                r.git('add', '.')
                r.git('commit', '-m', 'base')
                base = r.git('rev-parse', 'HEAD').decode().strip()
                r.git('checkout', '-b', 'head')
                for p, text in files.items(): Path(p).write_text('head\n'+text)
                r.git('commit', '-am', 'head')
                head = r.git('rev-parse', 'HEAD').decode().strip()
                r.git('checkout', 'main')
                for p, text in files.items(): Path(p).write_text('main\n'+text)
                r.git('commit', '-am', 'main')
                r.git('checkout', 'head')
                r.git('merge', '--no-commit', 'main', check=False)
                self.assertEqual(set(r.resolve_index()), set(files))
                self.assertEqual(r.git('diff', '--name-only', '--diff-filter=U'), b'')
                for p, text in files.items():
                    self.assertEqual(r.git('show', ':'+p).decode(), 'main\nhead\n'+text)
                r.git('reset', '--hard', 'HEAD')
                # An unsupported third path must prevent every repair.
                r.git('checkout', '-b', 'unsafe', base)
                Path('AGENTS.md').write_text('main\n')
                r.git('add', '.')
                r.git('commit', '-m', 'unsafe main')
                r.git('checkout', 'head')
                Path('AGENTS.md').write_text('head\n')
                r.git('add', '.')
                r.git('commit', '-m', 'unsafe head')
                r.git('merge', '--no-commit', 'unsafe', check=False)
                before = r.git('ls-files', '--unmerged')
                with self.assertRaises(ValueError): r.resolve_index()
                self.assertEqual(r.git('ls-files', '--unmerged'), before)
            finally:
                os.chdir(old)

if __name__ == '__main__': unittest.main()
