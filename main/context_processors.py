# main/context_processors.py
from .models import Note

def main_menu(request):
    # Query the database for notes that should be in the menu
    menu_notes = Note.objects.filter(show_in_menu=True).order_by('title')

    # Return a dictionary. The key will be the variable name in the template.
    return {
        'main_menu_notes': menu_notes
    }