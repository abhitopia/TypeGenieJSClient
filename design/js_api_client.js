import time
from datetime import datetime, timezone
from typing import List

import pandas as pd
from threading import Thread

import requests
from requests.auth import HTTPBasicAuth

BASE_URL = 'http://api.typegenie.net/api/v1'


class BearerAuth(requests.auth.AuthBase):
    def __init__(self, token):
        self.token = token

    def __call__(self, r):
        r.headers["authorization"] = "Bearer " + self.token
        return r


class AutoRenewThread(Thread):
    def __init__(self, api):
        super().__init__()
        self.api = api
        self._running = False

    def run(self):
        while self._running:
            result = self.api.renew(inplace=True)
            expires_at = pd.to_datetime(result['expires_at']).to_pydatetime().replace(tzinfo=timezone.utc)
            seconds_till_expiry = (expires_at - datetime.utcnow().replace(tzinfo=timezone.utc)).seconds
            renew_after = max(0, seconds_till_expiry - 100)
            time.sleep(renew_after)

    def start(self):
        if not self._running:
            self._running = True
            super().start()

    def stop(self):
        self._running = False


class API:
    COMMON_PREFIX = ''

    def __init__(self):
        self._session = requests.Session()
        self._session.headers.update({
            'Content-type': 'application/json',
            'Accept': 'application/json'
        })

    def _get_url(self, end_point):
        return f'{BASE_URL}{self.COMMON_PREFIX}{end_point}'

    def _request(self, func, url, **kwargs):
        try:
            resp = func(url, **kwargs)
            r = resp.json()
            if r['error'] is not None:
                resp.raise_for_status()
            else:
                return r['result']
        except requests.exceptions.HTTPError as err:
            err.args = list(err.args) + [f'Reason: {r["error"]}']
            raise

    def _get(self, endpoint):
        url = self._get_url(endpoint)
        return self._request(self._session.get, url=url)

    def _delete(self, endpoint):
        url = self._get_url(endpoint)
        return self._request(self._session.delete, url=url)

    def _post(self, endpoint, json):
        url = self._get_url(endpoint)
        return self._request(self._session.post, url=url, json=json)

    def _put(self, endpoint, json):
        url = self._get_url(endpoint)
        return self._request(self._session.put, url=url, json=json)



class UserAPI(API):
    COMMON_PREFIX = '/user'
    SESSION_SUFFIX = '/session'

    def __init__(self, token):
        super().__init__()
        self._session.auth = BearerAuth(token=token)
        self._auto_renew = AutoRenewThread(api=self)

    def enable_auto_renew(self):
        self._auto_renew.start()

    def disable_auto_renew(self):
        self._auto_renew.stop()

    def info(self):
        return self._get('')

    def renew_token(self, inplace=False):
        result = self._get('/renew')
        if inplace:
            self._session.auth = BearerAuth(token=result['token'])
        return result

    def create_session(self):
        return self._post(self.SESSION_SUFFIX, json={})

    def get_completions(self, session_id, events: List[dict], query: str):
        assert isinstance(session_id, str)
        payload = {'query': query, 'events': events}
        return self._post(f'{self.SESSION_SUFFIX}/{session_id}/completions', json=payload)
