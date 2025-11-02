"""
Train Data Scraper and Booking System for EasyMyTrip
Scrapes all available trains, displays options, and automates booking
"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional, Tuple
import re
import json


class TrainScraper:
    """Scrapes train data from EasyMyTrip"""
    
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    
    COACH_TYPES = {
        'SL': 'Sleeper',
        '3A': '3rd AC',
        '2A': '2nd AC',
        '1A': '1st AC',
        'CC': 'Chair Car',
        'FC': 'First Class',
        'EC': 'Executive Chair',
    }
    
    @staticmethod
    def extract_price(text: str) -> Optional[str]:
        """Extract price from text"""
        if not text:
            return None
        match = re.search(r'₹?\s*(\d+(?:[,\d]*)?)', text)
        if match:
            return match.group(0).strip()
        return None
    
    @staticmethod
    def extract_time(text: str) -> Optional[str]:
        """Extract time HH:MM format"""
        if not text:
            return None
        match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
        return None
    
    @staticmethod
    def extract_duration(text: str) -> Optional[str]:
        """Extract duration like 12h 30m"""
        if not text:
            return None
        match = re.search(r'(\d+)\s*(?:h|hr|hour)s?\s*(\d+)?\s*(?:m|min)?', text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
        return None
    
    @classmethod
    def scrape_trains(cls, url: str) -> Dict[str, Any]:
        """
        Scrape all train data from EasyMyTrip URL
        
        Args:
            url: EasyMyTrip trains URL
            
        Returns:
            dict with all trains and metadata
        """
        try:
            response = requests.get(url, headers=cls.HEADERS, timeout=15)
            response.raise_for_status()
            html = response.text
            
            soup = BeautifulSoup(html, 'html.parser')
            trains = []
            
            # Strategy 1: Look for train result containers
            train_containers = soup.find_all(['div', 'tr'], class_=re.compile(r'result|train|item|card', re.I))
            
            if not train_containers:
                # Strategy 2: Look for any divs with multiple children (likely train cards)
                all_divs = soup.find_all('div')
                train_containers = [d for d in all_divs if len(d.find_all(recursive=False)) > 3][:30]
            
            for idx, container in enumerate(train_containers):
                try:
                    text = container.get_text(separator=' | ', strip=True)
                    
                    # Skip if too small or contains common non-train text
                    if len(text) < 50 or any(x in text.lower() for x in ['search', 'filter', 'sort', 'view all']):
                        continue
                    
                    # Extract train number (4-5 digits)
                    train_num_match = re.search(r'\b(\d{4,5})\b', text)
                    if not train_num_match:
                        continue
                    
                    train_number = train_num_match.group(1)
                    
                    # Extract train name (usually first meaningful text)
                    lines = text.split(' | ')
                    train_name = lines[0][:100] if lines else f"Train {train_number}"
                    
                    # Extract times
                    times = re.findall(r'(\d{1,2}):(\d{2})', text)
                    departure = f"{times[0][0]}:{times[0][1]}" if len(times) > 0 else "TBD"
                    arrival = f"{times[1][0]}:{times[1][1]}" if len(times) > 1 else "TBD"
                    
                    # Extract duration
                    duration = cls.extract_duration(text) or "N/A"
                    
                    # Extract price (minimum)
                    prices = re.findall(r'₹?\s*(\d+(?:,\d{3})*)', text)
                    price = prices[0] if prices else "Contact"
                    
                    # Extract available coaches
                    coaches_available = []
                    for coach_code in ['SL', '3A', '2A', '1A', 'CC', 'FC']:
                        if coach_code in text.upper():
                            coaches_available.append(coach_code)
                    
                    if not coaches_available:
                        coaches_available = ['SL', '3A', '2A', '1A']  # Assume all available if not specified
                    
                    # Extract seats/availability
                    seats_match = re.search(r'(\d+)\s*(?:seats?|available)', text, re.IGNORECASE)
                    seats = seats_match.group(1) if seats_match else "Multiple"
                    
                    train_data = {
                        'index': len(trains),
                        'train_number': train_number,
                        'train_name': train_name,
                        'departure': departure,
                        'arrival': arrival,
                        'duration': duration,
                        'price_from': price,
                        'seats_available': seats,
                        'coaches_available': coaches_available,
                        'rating': 4.0,  # Default
                    }
                    
                    trains.append(train_data)
                    
                    if len(trains) >= 20:  # Limit to 20 trains
                        break
                
                except Exception as e:
                    continue
            
            return {
                'status': 'success' if trains else 'partial',
                'url': url,
                'total_trains': len(trains),
                'trains': trains,
                'message': f'Found {len(trains)} trains. Please select one and choose a coach class.'
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'url': url,
                'trains': [],
                'message': f'Error scraping trains: {str(e)}'
            }
    
    @classmethod
    def format_train_display(cls, trains: List[Dict[str, Any]]) -> str:
        """Format trains for display to user
        
        Returns:
            Formatted string with all trains
        """
        if not trains:
            return "No trains found."
        
        display = "\n" + "="*100 + "\n"
        display += "AVAILABLE TRAINS\n"
        display += "="*100 + "\n\n"
        
        for train in trains:
            display += f"[{train['index']}] {train['train_number']} - {train['train_name']}\n"
            display += f"    ⏱️  {train['departure']} → {train['arrival']}  |  Duration: {train['duration']}\n"
            display += f"    💰 Starting from: {train['price_from']}\n"
            display += f"    🚂 Available Coaches: {', '.join(train['coaches_available'])}\n"
            display += f"    💺 Seats Available: {train['seats_available']}\n"
            display += "\n"
        
        return display


class TrainBookingFlow:
    """Orchestrates the booking flow"""
    
    def __init__(self, url: str):
        self.url = url
        self.trains: List[Dict[str, Any]] = []
        self.selected_train: Optional[Dict[str, Any]] = None
        self.selected_coach: Optional[str] = None
    
    def fetch_trains(self) -> Dict[str, Any]:
        """Fetch and display trains"""
        result = TrainScraper.scrape_trains(self.url)
        self.trains = result.get('trains', [])
        return result
    
    def display_trains(self) -> str:
        """Display trains in user-friendly format"""
        return TrainScraper.format_train_display(self.trains)
    
    def select_train(self, train_index: int) -> Dict[str, Any]:
        """Select a train by index
        
        Args:
            train_index: Index of train to select
            
        Returns:
            dict with selected train details
        """
        if 0 <= train_index < len(self.trains):
            self.selected_train = self.trains[train_index]
            return {
                'status': 'success',
                'train': self.selected_train,
                'message': f'Selected Train {self.selected_train["train_number"]} - {self.selected_train["train_name"]}',
                'available_coaches': self.selected_train['coaches_available'],
                'next_step': 'Please select a coach class: SL (Sleeper), 3A (3rd AC), 2A (2nd AC), or 1A (1st AC)'
            }
        else:
            return {
                'status': 'error',
                'message': f'Invalid train index. Please select 0-{len(self.trains)-1}'
            }
    
    def select_coach(self, coach_class: str) -> Dict[str, Any]:
        """Select coach class
        
        Args:
            coach_class: Coach type (SL, 3A, 2A, 1A, etc.)
            
        Returns:
            dict with confirmation
        """
        if not self.selected_train:
            return {
                'status': 'error',
                'message': 'Please select a train first'
            }
        
        coach_upper = coach_class.upper().strip()
        
        if coach_upper not in self.selected_train['coaches_available']:
            return {
                'status': 'error',
                'message': f'Coach {coach_upper} not available for this train. Available: {", ".join(self.selected_train["coaches_available"])}',
                'available_coaches': self.selected_train['coaches_available']
            }
        
        self.selected_coach = coach_upper
        return {
            'status': 'success',
            'train_number': self.selected_train['train_number'],
            'train_name': self.selected_train['train_name'],
            'coach_class': self.selected_coach,
            'coach_name': TrainScraper.COACH_TYPES.get(self.selected_coach, self.selected_coach),
            'message': f'Selected {TrainScraper.COACH_TYPES.get(coach_upper, coach_upper)} ({coach_upper}) for Train {self.selected_train["train_number"]}'
        }
    
    def get_booking_summary(self) -> Dict[str, Any]:
        """Get booking summary before proceeding"""
        if not self.selected_train or not self.selected_coach:
            return {
                'status': 'error',
                'message': 'Incomplete booking details. Please select train and coach.'
            }
        
        return {
            'status': 'success',
            'summary': {
                'train_number': self.selected_train['train_number'],
                'train_name': self.selected_train['train_name'],
                'departure': self.selected_train['departure'],
                'arrival': self.selected_train['arrival'],
                'duration': self.selected_train['duration'],
                'coach_class': self.selected_coach,
                'coach_name': TrainScraper.COACH_TYPES.get(self.selected_coach, self.selected_coach),
                'price_from': self.selected_train['price_from'],
            },
            'message': 'Ready to proceed with booking. Please confirm to continue.'
        }


# Example usage functions
def display_available_trains(url: str) -> Dict[str, Any]:
    """Display all available trains for a route
    
    Args:
        url: EasyMyTrip trains URL
        
    Returns:
        dict with trains data
    """
    flow = TrainBookingFlow(url)
    result = flow.fetch_trains()
    
    # Print formatted display
    print(flow.display_trains())
    
    return result


def book_train_step_by_step(url: str, train_index: int, coach_class: str) -> Dict[str, Any]:
    """Book a train with given parameters
    
    Args:
        url: EasyMyTrip trains URL
        train_index: Index of train to book
        coach_class: Coach class (SL, 3A, 2A, 1A)
        
    Returns:
        dict with booking details and next steps
    """
    flow = TrainBookingFlow(url)
    
    # Step 1: Fetch trains
    fetch_result = flow.fetch_trains()
    if fetch_result['status'] == 'error':
        return fetch_result
    
    print(f"\n✅ Found {len(flow.trains)} trains\n")
    
    # Step 2: Select train
    train_result = flow.select_train(train_index)
    if train_result['status'] == 'error':
        return train_result
    
    print(f"✅ {train_result['message']}")
    print(f"   Available coaches: {', '.join(train_result['available_coaches'])}\n")
    
    # Step 3: Select coach
    coach_result = flow.select_coach(coach_class)
    if coach_result['status'] == 'error':
        return coach_result
    
    print(f"✅ {coach_result['message']}\n")
    
    # Step 4: Get summary
    summary_result = flow.get_booking_summary()
    
    print("="*80)
    print("BOOKING SUMMARY")
    print("="*80)
    for key, value in summary_result['summary'].items():
        print(f"{key.replace('_', ' ').title():<20}: {value}")
    print("="*80)
    
    return {
        'status': 'ready_for_booking',
        'url': url,
        'train_index': train_index,
        'coach_class': coach_class,
        'booking_summary': summary_result['summary'],
        'next_step': 'Use Playwright to navigate and complete booking. Call book_train_with_playwright()'
    }


if __name__ == '__main__':
    # Example URL
    example_url = "https://railways.easemytrip.com/TrainListInfo/Ongole--All-Stations-(ONG)-to-Hyderabad--All-Stations-(HYD)/2/04-11-2025"
    
    print("🚂 EasyMyTrip Train Scraper and Booking System\n")
    print(f"URL: {example_url}\n")
    
    # Step 1: Display available trains
    print("Step 1: Fetching available trains...\n")
    result = display_available_trains(example_url)
    
    if result['status'] != 'error' and result['trains']:
        # Step 2: Book a specific train
        print("\nStep 2: Booking Train...\n")
        booking_result = book_train_step_by_step(example_url, train_index=0, coach_class='2A')
        
        print("\nBooking Result:", json.dumps(booking_result, indent=2))
