from collections import namedtuple
from typing import List

Context = namedtuple('Context', ['query', 'completion', 'events'], defaults=("", "", []))


def event_binder(id, key, function):
    # Ideally this should bind only when the
    dom_path = get_id(editor)


class ContextManager:
    # Non-Async, purely un-eventfuly
    # Notice that no async/await methods are being used
    def __init__(self, events_callback):
        self.events_callback = events_callback

    def typing_keystroke(self, char: str):
        assert len(char) == 1
        context_now = self.context
        completion = context_now.completion

        if len(completion) > 0 and completion[0] == char:
            completion = completion[1:]
            query = context_now.query + char
            self.context = Context(query=query,
                                   completion=completion,
                                   events=context_now.events)

    def partial_accept(self):
        context_now = self.context
        completion = context_now.completion
        if len(completion) > 0:
            to_accept = completion.split()[0]
            query = context_now.query + to_accept
            completion = completion[len(to_accept):]
            self.context = Context(query=query,
                                   completion=completion,
                                   events=context_now.events)

    def accept(self):
        context_now = self.context
        completion = context_now.completion
        if len(completion) > 0:
            query = context_now.query + completion
            self.context = Context(query=query,
                                   completion="",
                                   events=context_now.events)

    def reset_query(self):
        # Note that the new events are only called when reset_query is called
        new_context = Context(events=self.events_callback(), query="", completion=None)
        self.context = new_context

    def show_completion(self, context_then: Context):
        context_now = self.context
        # Do something with context_now and context_then, to determine new context
        context_to_be = None
        self.context = context_to_be

    @property
    def context(self):
        raise NotImplementedError

    @context.setter
    def context(self, new_context):

        current_context = {"query": "Hello", "completion": " Omkar"}
        new_context = {"query": "Hello Omkar", "completion": ""}


        # determine the new query to render
        # determine the new completion to render

        raise NotImplementedError

    def get_scope(self):
        raise NotImplementedError


class TypeGenieAPIClient:
    # Stateless. Separate management of authentication object through this.
    # Allows developer to work with this without interacting with the editor
    def __init__(self, token, auto_renew=True):
        self._auto_renew = auto_renew
        self._token = token

    def get_completions(self, events, query):
        pass

    def create_session(self):
        pass


class PredictionManager:
    """Purpose is two fold
        1. Caching
        2. Throtting
    """
    def __init__(self, api_client):
        self.api_client = api_client
        self._cache: List[str] = []
        self.request_completions = Throttled(self._request_completions)

    def reset_cache(self):
        self._cache = []

    def get_cached_completion(self, context: Context):
        query = context.query
        cached_completions = []
        for cache in self._cache:
            if len(cache) > query and cache[:len(query)] == query:
                cached_completions.append(cache[len(query):])

        return cached_completions

    def update_cache(self, query: str, completions: List[str]):
        for completion in completions:
            self._cache.append(query + completion)

    async def _request_completions(self, new_context):
        completions = self.get_cached_completion(new_context)

        if len(completions) == 0:
            completions = await self.api_client.get_completions(events=new_context.events, query=new_context.query)
            self.update_cache(completions)

        # For now, let's take the first completion
        completion = completions[0]
        context_at_request = Context(completion=completion, events=new_context.events, query=new_context.query)
        return context_at_request


class TypeGenieEventBinder:
    def __init__(self, context_manager, api_client, binder_config):

        self.context_manager: ContextManager = context_manager
        self.prediction_manager = PredictionManager(api_client=api_client)

        # Use binder config to allow reconfigurable bindings.
        # Allowing developer to change key bindings,
        # Or even enable/disable features such as partial accept
        event_binder(scope=self.context_manager.get_scope(), 'TAB', self.on_accept)
        event_binder(scope=self.context_manager.get_scope(), 'SHIFT+TAB', self.on_partial_accept)
        event_binder(scope=self.context_manager.get_scope(), 'Any KEY', self.on_completions_requested)
        event_binder(scope=self.context_manager.get_scope(), 'ENTER', self.on_query_reset)

        self.last_context = self.context_manager.context

    async def on_accept(self):
        self.context_manager.accept()
        await self.on_context_update(self.context_manager.context)

    async def on_query_reset(self):
        self.context_manager.reset_query()
        self.prediction_manager.reset_cache()
        await self.on_context_update(self.context_manager.context)

    async def on_typing_keystroke(self, char):
        self.context_manager.typing_keystroke(char)
        await self.on_context_update(self.context_manager.context)

    async def on_partial_accept(self):
        self.context_manager.partial_accept()
        await self.on_context_update(self.context_manager.context)

    async def on_context_update(self, new_context):
        previous_context = self.last_context
        # Determine based on previous and new context whether to request completions
        # The purpose of this if condition
        if some_complicated_function_to_determine_whether_to_request_new_completion(previous_context, new_context):
            context_then = await self.prediction_manager.request_completions(new_context=new_context)
            self.context_manager.show_completion(context_then=context_then)

        self.last_context = new_context



previous_context = {
    'completion' : 'Omkar'
    'query': 'Hey '
}

new_context = {
    'completion': 'mkar'
    'query': 'Hey O'
}
