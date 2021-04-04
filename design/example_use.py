from froala_editor import get_froala_editor
import FroalaEditor

from typegenie import TypeGenieAPIClient

api_client = TypeGenieAPIClient(token="mytokendasf", auto_renew=True)


def events_callback():
    pass


editor = get_froala_editor(editor=FroalaEditor(),
                           api_client=api_client,
                           events_callback=events_callback)
