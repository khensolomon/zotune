# Setup

```bash
.\venv\Scripts\activate

pip install -r requirements.txt
pip install djangorestframework

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

python manage.py runserver

python manage.py create_demo_posts --number 50

python manage.py inspectdb type_word
python manage.py inspectdb list_word


```
