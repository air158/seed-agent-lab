import unittest
from cloud.verify import compare


class CloudObserverTests(unittest.TestCase):
    def healthy(self):
        first = dict(sequence=10, last_tick_ms=100000, healthy=True,
                     boot_id="same-boot", recent_ticks_ms=[100000])
        second = dict(sequence=100, last_tick_ms=190000, healthy=True,
                      boot_id="same-boot", recent_ticks_ms=list(range(101000, 191000, 1000)))
        return first, second

    def test_individual_ticks_match_quiet_interval(self):
        self.assertTrue(compare(*self.healthy(), 90)["passed"])

    def test_counter_without_timestamp_evidence_fails(self):
        first, second = self.healthy()
        second["recent_ticks_ms"] = [190000]
        self.assertFalse(compare(first, second, 90)["passed"])

    def test_stale_or_restarted_service_fails(self):
        first, second = self.healthy()
        second["healthy"] = False
        self.assertFalse(compare(first, second, 90)["passed"])
        second["healthy"] = True
        second["boot_id"] = "new-boot"
        self.assertFalse(compare(first, second, 90)["passed"])

    def test_never_started_service_reports_failure(self):
        empty = dict(sequence=0, last_tick_ms=None, healthy=False,
                     boot_id=None, recent_ticks_ms=[])
        self.assertFalse(compare(empty, empty, 90)["passed"])
