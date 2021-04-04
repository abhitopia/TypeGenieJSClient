from typegenie import ContextManager, Context, TypeGenieEventBinder, TypeGenieAPIClient


class HTMLContextManager(ContextManager):

    def __init__(self, text_only):
        pass

    @property
    def context(self):
        # Do something with the editor to create the context
        self.editor

    @context.setter
    def context(self, new_context):
        # Do something with the editor to set the context
        self.editor


class FroalaContextManager(HTMLConextManager):
    def __init__(self, editor, events_callback):
        super().__init__(events_callback=events_callback)
        self.editor = editor
        self.cur_po

    @property
    def context(self):
        # Do something with the editor to create the context
        self.editor

    @context.setter
    def context(self, new_context):
        # Do something with the editor to set the context
        self.editor

    def get_scope(self):
        """return Javascript event related"""
        self.editor
        """ Something like HTML block"""


def get_froala_editor(editor, api_client, events_callback):
    TypeGenieEventBinder(context_manager=FroalaContextManager(editor=editor,
                                                              events_callback=events_callback),
                         api_client=api_client)
    return editor

