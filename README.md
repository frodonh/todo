# Online task management for a small team

## Features
- Online access to the list of tasks
- Readonly access for people with restricted privileges
- API access for all the operations on the database (actually the web application only uses the API)
- Especially designed to facilitate the addition of new tasks from a *good* editor (Emacs or (Neo)Vim)
- Export list to CSV or JSON

## Requirements
- Apache server
- PHP 5.0 or higher
- PostgreSql 9.0 or higher

## Installation
- Copy all the files in a folder accessible for the Web server
- Create a file login.php with the login identifiers of the database. The file should initialize the following values:

| Variable  | Value                   |
|-----------|-------------------------|
| $host     | Address of the database |
| $dbname   | Name of the database    |
| $user     | User name               |
| $password | Password                |

- Browse to <http://path_on_your_web_server/create.htm> to create your first todo list
