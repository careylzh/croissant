Some system to allow software engineers to politely disturb their team's senior engineer without disrupting their workflow. 

# Onboarding

## Installation
Set up ssh keys to this github repo. Then save the following code as a `.sh` and run it in Terminal: 
```
#assume you have a fresh m1 (and above) machine
sudo su
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install postgresql^16
brew install nvm^0.39.1
brew install nodeJS^v23.9.0
git@github.com:VSIFC/croissant.git
cd croissant
npm i 
```
## How to use this repo
This readme on main describes the general updates, TODOS for frontend/backend and updates that can't be quantified as code this repo(deployment settings, setting up cloud infra).

I started off designing my architecture as reactjs -> expressJS (monolithic nodeJS server) -> prisma(ORM?) -> digital ocean droplet, but faced multiple issues including CORS and lambda fn deployment. So I went for a simpler stack using reactjs --> jsonbin.io (json store), but eventually got my initial design(on branch dev-jquery-aws-elasticsearch) working! 

1. Install nodeJS.
2. open a terminal and run the server (powers websocket server and reactJS server):
```
npm i
npm run build
npm run build:css
npm start
```
3. open another terminal, and run the bluetooth device discovery daemon:
```
node scan.js
```

## Running Database Migrations
#### First Time Running your local Database
```
sudo -u $(whoami) createuser --superuser postgres
psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
```
### If you want to use Prisma Studio to visualise your database schema, do this:

#### DEV
```
export $(grep -v '^#' .env.local | xargs) && npx prisma migrate dev --name [some-meaningful-name-delineated-by-dashes]
```
#### production
```
export $(grep -v '^#' .env | xargs) && npx prisma migrate deploy
```
```
npx prisma generate
npx prisma studio
```
#### Database Notes
- DO NOT delete migrations folder, ever. `git pull` and rebase on `main` branch if migrations are missing locally.
- \d "Device" in psql to show all tables, locally. 
- ignore `Message: Error in Prisma Client request: ` if you see that your local database schema has updated after running db migrations - this is just a warning that your production database has not been updated. 


## What's Deployed and Where?
| Branch | Frontend  | Backend | Db |
| ------------- | ------------- | ------------- | ------------- |
| - | ReactJS(localhost)| NodeJS: - Noble(background process) - Express - Prisma | supabase |

## Latest Notes
- always use `main` branch
- right now branches are automatically created whenever a Jira ticket is created with the format `IPR-[ticket number]-[ticket creator email address]`
- 
 
#### Architectural Decisions
-  nodeJS: imagined there is a need for a platform-agnostic frontend for configuring devices associated with a particular user, and visualising code changes
-  prisma: 
   -  I don't want to manually run migrations on a remote sql db.
   -  I want to visualise data in my remote db using Prisma Studio 

## TODO - General
- [x] requirement analysis, architecture planning for scalability (see google docs for defined behavior, then chatGPT conversations)
- [x] set up proj structure using npm for client and server folders, helper functions 
- [ ] deploy final version from master branch (when you can onboard 1 team of engineers)
- [ ] update deployment notes here w.r.t main branch

## TODO - frontend 
- [ ] frontend wireframe in terms of html elements
  - [ ] personal details onboarding screen
  - [ ] device selection screen
- [ ] implement checkbox in device selection page
- [ ] standardise css formatting reactjs (not a priority)
- [x] implement jquery + plain js for search bar

## TODO - backend
- [ ] implement API function for name search to interface betwn AWS gateway and Elastic Search
- [ ] implement prisma client and connect to supabase
- [ ] run migration for `Device` table
- [x] implement CRUD fns for Device
- [ ] auth? for collab in future 
  - [ ] google/github auth
- [ ] LOGGING: to see which error occurs instead of a generic category of errors 5XX or 4XX, or some frontend ReactJS error.
- [ ] write unit tests for `scan.js` 