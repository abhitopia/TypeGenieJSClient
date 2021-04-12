# TypeGenie JS Library
Contains the Javascript client library and frontend editor integrations for TypeGenie.


# Installation
```bash
npm install typegeniejs
```

# Usage

## Authenticate user
```js
import {UserAPI} from "typegeniejs"
let api_client = UserAPI(token=<USER_TOKEN>)  // This api client automatrically renews tokens
```

## Connect FroalaEditor
TypeGenie library monkey patches FroalaEditor to introduce a `connect_typegenie` function. Every instance of FroalaEditor needs to connect to `api_client` and provided a `events_callback` function. `event_callback` function returns a list of events (context) for making request to typegenie backend. For more information about the format of events, refer [here](http://api.typegenie.net/#upload-dialogues)

### FroalaEditor V3
```js
let editor = new FroalaEditor("#selector")
editor.connect_typegenie(api_client, events_callback)
```

### FroalaEditor V2
```js
// Initialize Froala editor.
$("#selector").froalaEditor()
$("#selector").froalaEditor.connect_typegenie(api_client, events_callback)
```


