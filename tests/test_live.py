import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from seedlab.live import serve
from seedlab.run import ROOT, atomic_write, initial_state


class LiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'control.json').write_text((ROOT / 'control.json').read_text())
        atomic_write(self.root / 'state/current.json', initial_state())

    def tearDown(self):
        self.temp.cleanup()

    def test_actual_one_second_heartbeat_with_bounded_run(self):
        stamps = []
        original = atomic_write
        def record(path, value):
            if value.get('status') == 'running':
                stamps.append(time.monotonic())
            original(path, value)
        with patch('seedlab.live.atomic_write', side_effect=record):
            result = serve(self.root, duration=2.2, run_tasks=False)
        self.assertEqual(result['sequence'], 3)
        self.assertEqual(result['status'], 'duration-complete')
        for a, b in zip(stamps, stamps[1:]):
            self.assertGreaterEqual(b - a, 0.8)
            self.assertLess(b - a, 1.5)
        saved = json.loads((self.root / 'work/heartbeat.json').read_text())
        self.assertFalse(saved['task_running'])

    def test_paused_control_never_starts_a_task(self):
        p = self.root / 'control.json'
        p.write_text(json.dumps({**json.loads(p.read_text()), 'enabled': False}))
        with patch('seedlab.live.subprocess.Popen') as launch:
            result = serve(self.root, duration=1)
        launch.assert_not_called()
        self.assertEqual(result['status'], 'paused')

    def test_stop_signal_exits_without_restart(self):
        stopped = threading.Event()
        stopped.set()
        with patch('seedlab.live.subprocess.Popen') as launch:
            result = serve(self.root, stop=stopped)
        launch.assert_not_called()
        self.assertEqual(result['status'], 'stopped')

    def test_heartbeat_continues_during_task_and_stop_terminates_child(self):
        children = []
        real_popen = subprocess.Popen
        def blocking_task(*args, **kwargs):
            child = real_popen([sys.executable, '-c', 'import time; time.sleep(30)'],
                               start_new_session=True)
            children.append(child)
            return child
        stopped = threading.Event()
        timer = threading.Timer(2.2, stopped.set)
        timer.start()
        try:
            with patch('seedlab.live.subprocess.Popen', side_effect=blocking_task):
                result = serve(self.root, duration=5, stop=stopped)
            self.assertGreaterEqual(result['sequence'], 2)
            self.assertEqual(result['status'], 'stopped')
            self.assertEqual(len(children), 1)
            self.assertIsNotNone(children[0].poll())
            self.assertLess(children[0].returncode, 0)
        finally:
            timer.cancel()
            for child in children:
                if child.poll() is None:
                    child.kill()
                    child.wait(timeout=3)

    def test_corrupt_state_fails_closed(self):
        (self.root / 'state/current.json').write_text('invalid')
        with patch('seedlab.live.subprocess.Popen') as launch:
            with self.assertRaises(ValueError):
                serve(self.root, duration=1)
        launch.assert_not_called()
        self.assertEqual(json.loads((self.root / 'work/heartbeat.json').read_text())['status'], 'error')

    def test_duration_cannot_be_infinite_or_negative(self):
        for duration in (-1, 0, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                serve(self.root, duration=duration)


if __name__ == '__main__':
    unittest.main()
