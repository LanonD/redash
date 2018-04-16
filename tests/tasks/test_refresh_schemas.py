import datetime

from mock import ANY, call, patch
from tests import BaseTestCase

from redash.tasks import refresh_schemas


class TestRefreshSchemas(BaseTestCase):
    def test_calls_refresh_of_all_data_sources(self):
        self.factory.data_source # trigger creation
        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_skips_paused_data_sources(self):
        self.factory.data_source.pause()

        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_not_called()

        self.factory.data_source.resume()

        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()
