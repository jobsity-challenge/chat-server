define({ "api": [
  {
    "type": "delete",
    "url": "/v1/chat/rooms/leave/:id",
    "title": "Remove user from chatroom",
    "name": "DeleteUserChatroom",
    "group": "Chat",
    "permission": [
      {
        "name": "'user'"
      }
    ],
    "description": "<p>Remove the current user from the given chatroom</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Bearer &lt;access token&gt;</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "URL parameter": [
          {
            "group": "URL parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom identifier (<code>REQUIRED</code>)</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom unique ID</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error status 401": [
          {
            "group": "Error status 401",
            "type": "Number",
            "optional": false,
            "field": "error",
            "description": "<p>Error number code</p> <p><code>1000</code> The access token isn't valid</p> <p><code>1001</code> The credentials used to authenticate are invalid</p> <p><code>1002</code> The authenticated account don't holds the required roles</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/routers/v1/chat.router.ts",
    "groupTitle": "Chat"
  },
  {
    "type": "post",
    "url": "/v1/chat/rooms",
    "title": "Register new chatroom",
    "name": "RegisterChatroom",
    "group": "Chat",
    "permission": [
      {
        "name": "'user'"
      }
    ],
    "description": "<p>Register new chatroom into the chat server</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Bearer &lt;access token&gt;</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "Body request fields": [
          {
            "group": "Body request fields",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Chatroom name (<code>REQUIRED</code>)</p>"
          },
          {
            "group": "Body request fields",
            "type": "String",
            "optional": true,
            "field": "topic",
            "description": "<p>Chatroom topic</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom unique ID</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error status 401": [
          {
            "group": "Error status 401",
            "type": "Number",
            "optional": false,
            "field": "error",
            "description": "<p>Error number code</p> <p><code>1000</code> The access token isn't valid</p> <p><code>1001</code> The credentials used to authenticate are invalid</p> <p><code>1002</code> The authenticated account don't holds the required roles</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/routers/v1/chat.router.ts",
    "groupTitle": "Chat"
  },
  {
    "type": "post",
    "url": "/v1/chat/rooms/message/:id",
    "title": "Register new message into chatroom",
    "name": "RegisterMessageChatroom",
    "group": "Chat",
    "permission": [
      {
        "name": "'user'"
      }
    ],
    "description": "<p>Send new message to a chatroom</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Bearer &lt;access token&gt;</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "URL parameter": [
          {
            "group": "URL parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom identifier (<code>REQUIRED</code>)</p>"
          }
        ],
        "Body request fields": [
          {
            "group": "Body request fields",
            "type": "String",
            "optional": true,
            "field": "message",
            "description": "<p>Message to send</p>"
          },
          {
            "group": "Body request fields",
            "type": "String",
            "optional": true,
            "field": "image",
            "description": "<p>Base64 image to send as message</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom unique ID</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error status 401": [
          {
            "group": "Error status 401",
            "type": "Number",
            "optional": false,
            "field": "error",
            "description": "<p>Error number code</p> <p><code>1000</code> The access token isn't valid</p> <p><code>1001</code> The credentials used to authenticate are invalid</p> <p><code>1002</code> The authenticated account don't holds the required roles</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/routers/v1/chat.router.ts",
    "groupTitle": "Chat"
  },
  {
    "type": "post",
    "url": "/v1/chat/rooms/join/:id",
    "title": "Register user into chatroom",
    "name": "RegisterUserChatroom",
    "group": "Chat",
    "permission": [
      {
        "name": "'user'"
      }
    ],
    "description": "<p>Join the current user to the given chatroom</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>Bearer &lt;access token&gt;</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "URL parameter": [
          {
            "group": "URL parameter",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom identifier (<code>REQUIRED</code>)</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Chatroom unique ID</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error status 401": [
          {
            "group": "Error status 401",
            "type": "Number",
            "optional": false,
            "field": "error",
            "description": "<p>Error number code</p> <p><code>1000</code> The access token isn't valid</p> <p><code>1001</code> The credentials used to authenticate are invalid</p> <p><code>1002</code> The authenticated account don't holds the required roles</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/routers/v1/chat.router.ts",
    "groupTitle": "Chat"
  }
] });
