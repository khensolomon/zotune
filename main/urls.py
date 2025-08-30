# main/urls.py (new file)
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about', views.about, name='about'),
    
    # Add the URLs for our notes
    path('notes/', views.note_list, name='note_list'),
    path('notes/<int:pk>', views.note_detail, name='note_detail'),

    # ForeignKey Relationship Demo
    path('posts/', views.post_list, name='post_list'),
    path('posts/<int:pk>/', views.post_detail, name='post_detail'),

    path('api/words/', views.ListWordAPIView.as_view(), name='word-api-list'),

    # URL for the API endpoint (returns JSON)
    # path('api/search/', views.ApiSearchView.as_view(), name='api_search'),
    path('api/search/', views.DictionarySearchView.as_view(), name='api_search'),
    
    # URL for the user-facing search page (renders HTML)
    # path('definition/', views.TemplateSearchView.as_view(), name='template_search'),
    # path('definition/',  views.search_page_view, name='template_search'),
]