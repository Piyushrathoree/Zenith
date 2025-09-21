# Zenith

This application is going to be similar and a open source version of https://www.sunsama.com/ 

This is a web application.

build on top of 
```
frontend        -> Typescript , Next.js , tailwindcss and some UI libraries.
backend         -> Python , FastAPI 
db              -> Mongodb , beanie(odm)
worker          -> Celery
message-queue   -> Redis
caching         -> Redis    
``` 


file structure as planned
 ```
Zenith
├── .gitignore
├── README.md                 # High-level documentation for the whole project
├── docker-compose.yml        # Defines and runs ALL services for local development
├── requirement.txt           # for list of all dependencies
│
├── frontend/                   # The self-contained React frontend application
│   ├── README.md
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── api/                # Functions for calling the backend API Gateway
│       ├── components/         # Reusable UI components
│       ├── hooks/              # Custom React hooks
│       └── pages/              # Page-level components
│
└── services/                   # Container for all independent backend microservices
    │
    ├── user-service/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py         # FastAPI entrypoint for User service
    │       ├── api/
    │       │   └── v1/
    │       │       └── users.py # Endpoints: /register, /login, /me
    │       ├── core/
    │       │   ├── config.py
    │       │   └── security.py # Password hashing, JWT creation
    │       ├── crud/
    │       │   └── user.py
    │       ├── db/
    │       │   └── models.py   # User model
    │       └── messaging/
    │       │   └── producer.py # Publishes `user.registered` event
    │       ├── .env
    │
    ├── planner-service/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py
    │       ├── api/
    │       │   └── v1/
    │       │       ├── tasks.py
    │       │       └── projects.py
    │       ├── crud/
    │       │   ├── task.py
    │       │   └── project.py
    │       ├── db/
    │       │   └── models.py   # Task, Project models
    │       └── messaging/
    │       │   └── consumer.py # Listens for events from other services
    │       ├── .env
    │
    ├── integration-service/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py
    │       ├── api/
    │       │   └── v1/
    │       │       ├── github.py # OAuth callback endpoints
    │       │       └── notion.py
    │       ├── clients/          # Logic to talk to external APIs
    │       │   ├── github_client.py
    │       │   └── notion_client.py
    │       ├── core/
    │       │   └── security.py   # For encrypting/decrypting stored API tokens
    │       ├── db/
    │       │   └── models.py     # Integration model for storing tokens
    │       ├── worker/           # Celery for running slow sync jobs
    │       │   ├── celery_app.py
    │       │   └── tasks.py
    │       └── messaging/
    │       │   └── producer.py   # Publishes `*.imported` events
    │       ├── .env
    │
    ├── notification-service/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py           # Starts the message consumer
    │       ├── messaging/
    │       │   └── consumer.py   # Main entrypoint, listens for events to trigger emails
    │       ├── services/
    │       │   └── gmail_service.py # Logic to send emails via Gmail API
    │       └── templates/
    │       │  └── welcome_email.html
    │       ├── .env
    │
    └── payment-service/
        ├── Dockerfile
        ├── requirements.txt
        └── app/
            ├── main.py
            ├── api/
            │   └── v1/
            │       ├── checkout.py # Endpoint to create Stripe sessions
            │       └── webhooks.py # Endpoint to receive events from Stripe
            ├── db/
            │   └── models.py     # Subscription, Customer models
            └── services/
            │   └── stripe_service.py # All logic for interacting with Stripe
            ├── .env
 ```