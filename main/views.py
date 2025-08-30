# from django.shortcuts import render
# from .models import Note # Import the Note model

from rest_framework import generics, pagination, filters, views, response, status # Import new modules
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator # Import the Paginator
from .models import (
    Note, Post,
    ListWord
)

from .serializers import ListWordSerializer


from .search_engine import DictionarySearch



# Create your views here.
# main/views.py
# from django.http import HttpResponse

# def home(request):
#     return HttpResponse("<h1>Hello, Django World!</h1>")

def home(request):
    # The context dictionary passes data to the template
    context = {
        'page_title': 'Hello, Django World!'
    }
    return render(request, 'main/home.html', context)

def about(request):
    context = {
        'page_title': 'About Us'
    }
    return render(request, 'main/about.html', context)

# View for listing all notes
def note_list(request):
    notes = Note.objects.all().order_by('-created_at') # Get all notes, newest first
    context = {
        'notes': notes,
    }
    return render(request, 'main/note_list.html', context)

# View for a single note
def note_detail(request, pk):
    note = Note.objects.get(pk=pk) # Get the specific note by its primary key (pk)
    context = {
        'note': note,
    }
    return render(request, 'main/note_detail.html', context)

def post_list(request):
    # posts = Post.objects.all().order_by('-created_at')
    # context = {
    #     'posts': posts
    # }
    # return render(request, 'main/post_list.html', context)
    all_posts = Post.objects.all().order_by('-created_at')
    
    # Set up the Paginator
    paginator = Paginator(all_posts, 2) # Show 10 posts per page
    page_number = request.GET.get('page') # Get the current page number from the URL
    page_obj = paginator.get_page(page_number) # Get the Page object for the requested page

    context = {
        'page_obj': page_obj # Pass the Page object to the template
    }
    return render(request, 'main/post_list.html', context)

def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    # The 'post.comments.all()' comes from the related_name we set in the model
    context = {
        'post': post,
        'comments': post.comments.all().order_by('created_at')
    }
    return render(request, 'main/post_detail.html', context)

# 1. Create a custom pagination class (optional, but good practice)
class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 100  # Number of results per page
    page_size_query_param = 'page_size' # Allows client to set page_size e.g. ?page_size=50
    max_page_size = 1000 # Maximum page size client can request
    # page_query_param = 'p' # Add this line to change "page" to "p"

# --- Create a custom search filter ---
class CustomSearchFilter(filters.SearchFilter):
    # This is the line that changes the query parameter
    search_param = 'k'

# --- Update the API view to use the custom filter ---
class ListWordAPIView(generics.ListAPIView):
    """
    API view to search for words.
    Supports searching with ?k=keyword
    Supports pagination with ?page=number
    """
    queryset = ListWord.objects.all()
    serializer_class = ListWordSerializer
    
    # Use your new custom filter class
    filter_backends = [CustomSearchFilter]
    pagination_class = StandardResultsSetPagination
    
    search_fields = ['^word']

class DictionarySearchView(views.APIView):
    """
    API endpoint for the dictionary search.
    Accepts a 'q' query parameter.
    e.g., /api/search/?q=love
    e.g., /api/search/?q=knowledge is power~power
    """
    def get(self, request, *args, **kwargs):
        query = request.query_params.get('q', None)
        
        if query is None:
            return response.Response(
                {"error": "Query parameter 'q' is required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        search_engine = DictionarySearch(raw_query=query)
        response_data = search_engine.execute()

        
        return response.Response(response_data)




