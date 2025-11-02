"""
Train Booking Handler with Playwright
Handles automated booking of trains from EasyMyTrip using Playwright
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from playwright.async_api import async_playwright, Page


class TrainBookingHandler:
    """Handles train booking automation using Playwright"""
    
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
    
    async def initialize(self):
        """Initialize Playwright browser"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=False)  # Set to True for headless
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
    
    async def navigate_to_trains(self, url: str) -> bool:
        """Navigate to the trains page on EasyMyTrip
        
        Args:
            url: EasyMyTrip trains URL
            
        Returns:
            bool: True if navigation successful
        """
        try:
            await self.page.goto(url, wait_until='networkidle')
            await self.page.wait_for_timeout(3000)  # Wait for page to load
            return True
        except Exception as e:
            print(f"Error navigating to URL: {e}")
            return False
    
    async def get_all_trains(self) -> List[Dict[str, Any]]:
        """Extract all trains currently displayed on the page
        
        Returns:
            List of train information dictionaries
        """
        try:
            trains = []
            
            # Get all train cards
            train_cards = await self.page.query_selector_all('[data-test*="train"], .train-card, .result-item')
            
            if not train_cards:
                # Try alternative selectors
                train_cards = await self.page.query_selector_all('div[class*="train"], tr[class*="train"]')
            
            for idx, card in enumerate(train_cards):
                try:
                    # Extract train details
                    train_info = await card.evaluate('''(el) => {
                        const getText = (selector) => el.querySelector(selector)?.textContent?.trim() || '';
                        const getAttr = (selector, attr) => el.querySelector(selector)?.getAttribute(attr) || '';
                        
                        return {
                            train_number: getText('[data-test*="number"], .train-number'),
                            train_name: getText('[data-test*="name"], .train-name, h3, h4'),
                            departure: getText('[data-test*="depart"], .departure, .time'),
                            arrival: getText('[data-test*="arrive"], .arrival'),
                            duration: getText('[data-test*="duration"], .duration'),
                            price: getText('[data-test*="price"], .price, .fare'),
                            seats: getText('[data-test*="seats"], .seats'),
                            rating: getText('[data-test*="rating"], .rating'),
                            index: %d
                        };
                    }''' % idx)
                    
                    trains.append(train_info)
                except Exception as e:
                    print(f"Error extracting train {idx}: {e}")
                    continue
            
            return trains
        except Exception as e:
            print(f"Error getting trains: {e}")
            return []
    
    async def select_train(self, train_index: int) -> bool:
        """Click on a specific train to select it
        
        Args:
            train_index: Index of the train to click
            
        Returns:
            bool: True if train selected successfully
        """
        try:
            # Try different selectors for train cards
            selectors = [
                f'[data-test*="train"]:nth-child({train_index})',
                f'.train-card:nth-child({train_index})',
                f'.result-item:nth-child({train_index})',
                f'tr[class*="train"]:nth-child({train_index})',
            ]
            
            for selector in selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click()
                        await self.page.wait_for_timeout(2000)
                        return True
                except:
                    continue
            
            print(f"Could not find train at index {train_index}")
            return False
        except Exception as e:
            print(f"Error selecting train: {e}")
            return False
    
    async def proceed_to_booking(self) -> Dict[str, Any]:
        """Proceed through train selection to booking page
        
        Returns:
            dict with booking details and current page URL
        """
        try:
            # Wait for booking button/link
            book_button_selectors = [
                'button[data-test*="book"]',
                'a[data-test*="book"]',
                'button:has-text("Book")',
                '.book-btn',
                'button[class*="book"]',
            ]
            
            for selector in book_button_selectors:
                try:
                    book_button = await self.page.query_selector(selector)
                    if book_button:
                        await book_button.click()
                        await self.page.wait_for_timeout(2000)
                        
                        return {
                            'status': 'success',
                            'current_url': self.page.url,
                            'message': 'Proceeded to booking page',
                        }
                except:
                    continue
            
            return {
                'status': 'no_button_found',
                'current_url': self.page.url,
                'message': 'Could not find book button on this page',
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'current_url': self.page.url,
            }
    
    async def fill_passenger_details(self, passengers: List[Dict[str, str]]) -> bool:
        """Fill passenger details on booking form
        
        Args:
            passengers: List of passenger dictionaries with 'name', 'age', 'gender'
            
        Returns:
            bool: True if all details filled successfully
        """
        try:
            for idx, passenger in enumerate(passengers):
                # Look for name field
                name_selectors = [
                    f'input[data-test*="name-{idx}"]',
                    f'input[placeholder*="Name"], input[name*="name"]',
                ]
                
                for selector in name_selectors:
                    try:
                        name_input = await self.page.query_selector(selector)
                        if name_input:
                            await name_input.fill(passenger.get('name', ''))
                            break
                    except:
                        continue
                
                # Look for age field
                age_selectors = [
                    f'input[data-test*="age-{idx}"]',
                    f'input[placeholder*="Age"]',
                ]
                
                for selector in age_selectors:
                    try:
                        age_input = await self.page.query_selector(selector)
                        if age_input:
                            await age_input.fill(str(passenger.get('age', '')))
                            break
                    except:
                        continue
                
                # Look for gender field
                gender = passenger.get('gender', 'M')
                gender_selectors = [
                    f'select[data-test*="gender-{idx}"]',
                    f'[data-test*="gender"] button:has-text("{gender[0]}")',
                    f'input[value="{gender}"]',
                ]
                
                for selector in gender_selectors:
                    try:
                        gender_input = await self.page.query_selector(selector)
                        if gender_input:
                            await gender_input.click()
                            break
                    except:
                        continue
            
            return True
        except Exception as e:
            print(f"Error filling passenger details: {e}")
            return False
    
    async def proceed_to_payment(self) -> Dict[str, Any]:
        """Click proceed/continue button to go to payment
        
        Returns:
            dict with status and current page info
        """
        try:
            # Look for continue/proceed button
            buttons = await self.page.query_selector_all('button')
            
            for button in buttons:
                text = await button.text_content()
                if any(word in text.lower() for word in ['continue', 'proceed', 'next', 'payment']):
                    await button.click()
                    await self.page.wait_for_timeout(2000)
                    
                    return {
                        'status': 'success',
                        'current_url': self.page.url,
                        'message': f'Clicked "{text.strip()}" button',
                    }
            
            return {
                'status': 'error',
                'message': 'Continue button not found',
                'current_url': self.page.url,
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'current_url': self.page.url,
            }
    
    async def get_booking_summary(self) -> Dict[str, Any]:
        """Extract booking summary from current page
        
        Returns:
            dict with booking details
        """
        try:
            summary = await self.page.evaluate('''() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    price: document.body.innerText.match(/₹?\s*\d+(?:[,\d]*)?/)?.[0] || 'N/A',
                    content_preview: document.body.innerText.substring(0, 500)
                };
            }''')
            
            return {
                'status': 'success',
                'summary': summary,
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }
    
    async def close(self):
        """Close browser and cleanup"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()


# Convenience functions for synchronous usage
def book_train_interactive(url: str, train_index: int) -> Dict[str, Any]:
    """Book a train interactively (blocking call)
    
    Args:
        url: EasyMyTrip trains URL
        train_index: Index of train to book
        
    Returns:
        dict with booking status
    """
    async def _book():
        handler = TrainBookingHandler()
        try:
            await handler.initialize()
            
            # Navigate to trains page
            if not await handler.navigate_to_trains(url):
                return {'status': 'error', 'error': 'Failed to navigate to URL'}
            
            # Get all trains
            trains = await handler.get_all_trains()
            if not trains:
                return {'status': 'error', 'error': 'No trains found on page'}
            
            print(f"Found {len(trains)} trains")
            print("Trains available:")
            for i, train in enumerate(trains):
                print(f"  {i}: {train.get('train_name')} ({train.get('train_number')})")
            
            # Select train
            if not await handler.select_train(train_index):
                return {
                    'status': 'error',
                    'error': f'Could not select train at index {train_index}'
                }
            
            # Proceed to booking
            result = await handler.proceed_to_booking()
            
            # Get booking summary
            summary = await handler.get_booking_summary()
            result['summary'] = summary.get('summary')
            
            return result
        
        finally:
            await handler.close()
    
    return asyncio.run(_book())


if __name__ == '__main__':
    # Example usage
    print("Train Booking Handler - Example Usage\n")
    
    example_url = "https://railways.easemytrip.com/TrainListInfo/Ongole--All-Stations-(ONG)-to-Hyderabad--All-Stations-(HYD)/2/04-11-2025"
    
    print(f"URL: {example_url}\n")
    print("To book a train interactively:")
    print(f"  result = book_train_interactive('{example_url}', train_index=0)")
    print(f"  print(result)\n")
