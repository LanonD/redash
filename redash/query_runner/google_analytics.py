# -*- coding: utf-8 -*-

import json
import logging
from base64 import b64decode
from datetime import datetime
from urlparse import parse_qs, urlparse

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from oauth2client.service_account import ServiceAccountCredentials
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    import httplib2
    enabled = True
except ImportError as e:
    enabled = False


types_conv = dict(
    STRING=TYPE_STRING,
    INTEGER=TYPE_INTEGER,
    FLOAT=TYPE_FLOAT,
    DATE=TYPE_DATE,
    DATETIME=TYPE_DATETIME
)


def parse_ga_response(response):
    columns = []
    for h in response['columnHeaders']:
        if h['name'] in ('ga:date', 'mcf:conversionDate'):
            h['dataType'] = 'DATE'
        elif h['name'] == 'ga:dateHour':
            h['dataType'] = 'DATETIME'
        columns.append({
            'name': h['name'],
            'friendly_name': h['name'].split(':', 1)[1],
            'type': types_conv.get(h['dataType'], 'string')
        })

    rows = []
    for r in response['rows']:
        d = {}
        for c, value in enumerate(r):
            column_name = response['columnHeaders'][c]['name']
            column_type = filter(lambda col: col['name'] == column_name, columns)[0]['type']

            # mcf results come a bit different than ga results:
            if isinstance(value, dict):
                if 'primitiveValue' in value:
                    value = value['primitiveValue']
                elif 'conversionPathValue' in value:
                    steps = []
                    for step in value['conversionPathValue']:
                        steps.append('{}:{}'.format(step['interactionType'], step['nodeValue']))
                    value = ', '.join(steps)
                else:
                    raise Exception("Results format not supported")

            if column_type == TYPE_DATE:
                value = datetime.strptime(value, '%Y%m%d')
            elif column_type == TYPE_DATETIME:
                if len(value) == 10:
                    value = datetime.strptime(value, '%Y%m%d%H')
                elif len(value) == 12:
                    value = datetime.strptime(value, '%Y%m%d%H%M')
                else:
                    raise Exception("Unknown date/time format in results: '{}'".format(value))

            d[column_name] = value
        rows.append(d)

    return {'columns': columns, 'rows': rows}


class GoogleAnalytics(BaseSQLQueryRunner):
    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "google_analytics"

    @classmethod
    def name(cls):
        return "Google Analytics"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'jsonKeyFile': {
                    "type": "string",
                    'title': 'JSON Key File'
                }
            },
            'required': ['jsonKeyFile'],
            'secret': ['jsonKeyFile']
        }

    def __init__(self, configuration):
        super(GoogleAnalytics, self).__init__(configuration)
        self.syntax = 'json'

    def _get_analytics_service(self):
        scope = ['https://www.googleapis.com/auth/analytics.readonly']
        key = json.loads(b64decode(self.configuration['jsonKeyFile']))
        creds = ServiceAccountCredentials.from_json_keyfile_dict(key, scope)
        return build('analytics', 'v3', http=creds.authorize(httplib2.Http()))

    def _get_tables(self, schema):
        accounts = self._get_analytics_service().management().accounts().list().execute().get('items')
        if accounts is None:
            raise Exception("Failed getting accounts.")
        else:
            for account in accounts:
                schema[account['name']] = {'name': account['name'], 'columns': []}
                properties = self._get_analytics_service().management().webproperties().list(
                    accountId=account['id']).execute().get('items', [])
                for property_ in properties:
                    schema[account['name']]['columns'].append(
                        u'{0} (ga:{1})'.format(property_['name'], property_['defaultProfileId'])
                    )

        return schema.values()

    def test_connection(self):
        try:
            service = self._get_analytics_service()
            service.management().accounts().list().execute()
        except HttpError as e:
            # Make sure we return a more readable error to the end user
            raise Exception(e._get_reason())

    def run_query(self, query, user):
        logger.debug("Analytics is about to execute query: %s", query)
        try:
            params = json.loads(query)
        except:
            params = parse_qs(urlparse(query).query, keep_blank_values=True)
            for key in params.keys():
                params[key] = ','.join(params[key])
                if '-' in key:
                    params[key.replace('-', '_')] = params.pop(key)

        if 'mcf:' in params['metrics'] and 'ga:' in params['metrics']:
            raise Exception("Can't mix mcf: and ga: metrics.")

        if 'mcf:' in params.get('dimensions', '') and 'ga:' in params.get('dimensions', ''):
            raise Exception("Can't mix mcf: and ga: dimensions.")

        if 'mcf:' in params['metrics']:
            api = self._get_analytics_service().data().mcf()
        else:
            api = self._get_analytics_service().data().ga()

        if len(params) > 0:
            try:
                response = api.get(**params).execute()
                data = parse_ga_response(response)
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            except HttpError as e:
                # Make sure we return a more readable error to the end user
                error = e._get_reason()
                json_data = None
        else:
            error = 'Wrong query format.'
            json_data = None
        return json_data, error


register(GoogleAnalytics)
