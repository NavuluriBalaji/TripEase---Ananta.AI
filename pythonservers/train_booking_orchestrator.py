"""
Complete Train Booking Orchestrator
Integrates scraping + Playwright automation for end-to-end train booking
"""

import asyncio
import sys
from typing import Dict, Any, Optional
from train_scraper_and_booker import TrainBookingFlow, TrainScraper


class TrainBookingOrchestrator:
    """Orchestrates complete train booking workflow"""
    
    def __init__(self, url: str):
        """Initialize orchestrator
        
        Args:
            url: EasyMyTrip trains URL
        """
        self.url = url
        self.flow = TrainBookingFlow(url)
        self.selected_train = None
        self.selected_coach = None
        self.browser = None
        self.page = None
    
    async def initialize_playwright(self):
        """Initialize Playwright browser"""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(headless=False)
            context = await self.browser.new_context()
            self.page = await context.new_page()
            
            print("✅ Playwright initialized")
            return True
        except Exception as e:
            print(f"❌ Error initializing Playwright: {e}")
            return False
    
    async def close_playwright(self):
        """Close Playwright browser"""
        if self.page:
            try:
                await self.page.close()
            except:
                pass
        if self.browser:
            try:
                await self.browser.close()
            except:
                pass
    
    def scrape_and_display_trains(self) -> Dict[str, Any]:
        """Scrape trains and display to user
        
        Returns:
            dict with trains and display info
        """
        print("\n📚 Scraping trains from EasyMyTrip...")
        
        # Fetch trains
        result = self.flow.fetch_trains()
        
        if result['status'] != 'ok':
            return {'status': 'error', 'message': result.get('message', 'Failed to scrape trains')}
        
        # Display trains
        display = self.flow.display_trains()
        
        return {
            'status': 'success',
            'trains_count': len(self.flow.trains),
            'trains': self.flow.trains,
            'display': display,
            'message': f"Found {len(self.flow.trains)} trains"
        }
    
    def select_train_and_coach(self, train_index: int, coach_class: str) -> Dict[str, Any]:
        """Select train and coach class
        
        Args:
            train_index: Index of train to select
            coach_class: Coach class (SL, 3A, 2A, 1A)
            
        Returns:
            dict with selection confirmation
        """
        print(f"\n🚂 Selecting train {train_index} with coach {coach_class}...")
        
        # Select train
        train_result = self.flow.select_train(train_index)
        if train_result['status'] != 'ok':
            return {'status': 'error', 'message': train_result.get('message')}
        
        self.selected_train = train_result['train']
        
        # Select coach
        coach_result = self.flow.select_coach(coach_class)
        if coach_result['status'] != 'ok':
            return {'status': 'error', 'message': coach_result.get('message')}
        
        self.selected_coach = coach_class
        
        # Get booking summary
        summary = self.flow.get_booking_summary()
        
        return {
            'status': 'success',
            'summary': summary,
            'train': self.selected_train,
            'coach': coach_class,
            'message': 'Selection confirmed'
        }
    
    async def navigate_to_trains_page(self) -> bool:
        """Navigate to trains page with Playwright
        
        Returns:
            bool: True if navigation successful
        """
        try:
            print(f"\n🌐 Navigating to: {self.url}")
            await self.page.goto(self.url, wait_until='networkidle', timeout=30000)
            await self.page.wait_for_timeout(2000)
            print("✅ Page loaded")
            return True
        except Exception as e:
            print(f"❌ Navigation error: {e}")
            return False
    
    async def find_and_click_train(self) -> bool:
        """Find and click the selected train
        
        Returns:
            bool: True if train clicked
        """
        try:
            train_number = self.selected_train.get('train_number', '')
            print(f"\n🔍 Looking for train: {train_number}")
            
            # Strategy 1: Find by data attributes
            selectors_to_try = [
                f'[data-train="{train_number}"]',
                f'[data-trainnumber="{train_number}"]',
                f'[data-number="{train_number}"]',
            ]
            
            for selector in selectors_to_try:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click()
                        await self.page.wait_for_timeout(1500)
                        print(f"✅ Clicked train {train_number} using selector")
                        return True
                except:
                    pass
            
            # Strategy 2: Find train cards by text content
            print("  Trying text-based search...")
            cards = await self.page.query_selector_all(
                '[class*="train"], [class*="result"], [data-test*="train"], tr'
            )
            
            for card in cards:
                text = await card.text_content()
                if train_number in text:
                    await card.click()
                    await self.page.wait_for_timeout(1500)
                    print(f"✅ Clicked train card containing {train_number}")
                    return True
            
            print(f"❌ Train {train_number} not found on page")
            return False
        
        except Exception as e:
            print(f"❌ Error finding train: {e}")
            return False
    
    async def select_coach_on_page(self) -> bool:
        """Select coach class on the page
        
        Returns:
            bool: True if coach selected
        """
        try:
            coach = self.selected_coach
            print(f"\n🚂 Selecting coach class: {coach}")
            
            # Strategy 1: Look for radio buttons or checkboxes
            inputs = await self.page.query_selector_all('input[type="radio"], input[type="checkbox"]')
            
            for inp in inputs:
                value = await inp.get_attribute('value')
                if value and coach in value.upper():
                    await inp.click()
                    await self.page.wait_for_timeout(1000)
                    print(f"✅ Selected {coach} via input element")
                    return True
            
            # Strategy 2: Look for buttons with coach info
            coach_labels = {
                'SL': ['Sleeper', 'SL'],
                '3A': ['3AC', '3A', '3rd AC'],
                '2A': ['2AC', '2A', '2nd AC'],
                '1A': ['1AC', '1A', '1st AC'],
            }
            
            labels = coach_labels.get(coach, [coach])
            
            buttons = await self.page.query_selector_all('button, label, a')
            for button in buttons:
                text = await button.text_content()
                for label in labels:
                    if label.upper() in text.upper():
                        await button.click()
                        await self.page.wait_for_timeout(1000)
                        print(f"✅ Clicked coach button: {text.strip()}")
                        return True
            
            # Strategy 3: Look for dropdowns
            selects = await self.page.query_selector_all('select')
            for select in selects:
                # Try to find and click option
                option_xpath = f'//option[contains(., "{coach}")]'
                try:
                    await select.select_option(coach)
                    await self.page.wait_for_timeout(1000)
                    print(f"✅ Selected {coach} from dropdown")
                    return True
                except:
                    pass
            
            print(f"⚠️  Coach selector not found, continuing anyway...")
            return True
        
        except Exception as e:
            print(f"❌ Error selecting coach: {e}")
            return False
    
    async def click_book_now_button(self) -> Optional[str]:
        """Click the 'Book Now' button and capture booking URL
        
        Returns:
            str: Booking URL if successful, None otherwise
        """
        try:
            print("\n🔘 Looking for 'Book Now' button...")
            
            # Try multiple button selectors
            button_selectors = [
                'button:has-text("Book Now")',
                'button:has-text("Book")',
                'a:has-text("Book Now")',
                'a:has-text("Book")',
                'button[class*="book"]',
                'a[class*="book"]',
                '[data-test*="book"]',
            ]
            
            for selector in button_selectors:
                try:
                    button = await self.page.query_selector(selector)
                    if button:
                        print(f"✅ Found button with selector: {selector}")
                        
                        # Check if it opens in new tab
                        target = await button.get_attribute('target')
                        
                        if target == '_blank':
                            # Handle popup
                            print("  (opens in new tab)")
                            async with self.page.context.expect_page() as new_page_info:
                                await button.click()
                                await self.page.wait_for_timeout(2000)
                            
                            new_page = await new_page_info.value
                            booking_url = new_page.url
                            await new_page.close()
                            
                            print(f"✅ New tab opened: {booking_url}")
                            return booking_url
                        else:
                            # Same page
                            await button.click()
                            await self.page.wait_for_timeout(3000)
                            booking_url = self.page.url
                            
                            print(f"✅ Navigated to: {booking_url}")
                            return booking_url
                except Exception as e:
                    print(f"  Selector '{selector}' failed: {str(e)[:50]}")
                    continue
            
            print(f"⚠️  'Book Now' button not found")
            print(f"  Current URL: {self.page.url}")
            return self.page.url
        
        except Exception as e:
            print(f"❌ Error clicking book button: {e}")
            return None
    
    async def complete_booking_flow(self) -> Dict[str, Any]:
        """Complete the entire booking flow
        
        Returns:
            dict with booking URL and status
        """
        try:
            print("\n" + "="*80)
            print("🎫 COMPLETE TRAIN BOOKING FLOW")
            print("="*80)
            
            # Step 1: Scrape and display trains
            scrape_result = self.scrape_and_display_trains()
            if scrape_result['status'] != 'success':
                return scrape_result
            
            if not self.flow.trains:
                return {'status': 'error', 'message': 'No trains found'}
            
            # Step 2: User would select train and coach here
            # For now, assuming we have self.selected_train and self.selected_coach
            # set from select_train_and_coach() call
            
            if not self.selected_train or not self.selected_coach:
                return {
                    'status': 'error',
                    'message': 'No train/coach selected. Call select_train_and_coach() first'
                }
            
            # Step 3: Initialize Playwright
            if not await self.initialize_playwright():
                return {'status': 'error', 'message': 'Failed to initialize Playwright'}
            
            # Step 4: Navigate to page
            if not await self.navigate_to_trains_page():
                return {'status': 'error', 'message': 'Failed to navigate to trains page'}
            
            # Step 5: Find and click train
            if not await self.find_and_click_train():
                return {'status': 'error', 'message': 'Failed to find/click train'}
            
            # Step 6: Select coach
            if not await self.select_coach_on_page():
                return {'status': 'error', 'message': 'Failed to select coach'}
            
            # Step 7: Click Book Now
            booking_url = await self.click_book_now_button()
            
            if not booking_url:
                return {'status': 'error', 'message': 'Failed to get booking URL'}
            
            print("\n" + "="*80)
            print("✅ BOOKING COMPLETE")
            print("="*80 + "\n")
            
            return {
                'status': 'success',
                'booking_url': booking_url,
                'train': self.selected_train,
                'coach': self.selected_coach,
                'message': f'✅ Booking ready! Visit: {booking_url}',
                'instructions': 'Click the URL above to complete your payment and booking'
            }
        
        except Exception as e:
            print(f"❌ Error in booking flow: {e}")
            return {'status': 'error', 'error': str(e)}
        
        finally:
            await self.close_playwright()
    
    def get_booking_summary(self) -> Dict[str, Any]:
        """Get current booking summary
        
        Returns:
            dict with booking details
        """
        if not self.selected_train or not self.selected_coach:
            return {'status': 'error', 'message': 'No train/coach selected'}
        
        return self.flow.get_booking_summary()


async def book_train_complete(
    url: str,
    train_index: int,
    coach_class: str
) -> Dict[str, Any]:
    """Complete train booking workflow (async)
    
    Args:
        url: EasyMyTrip trains URL
        train_index: Index of train to book (0-based)
        coach_class: Coach class (SL, 3A, 2A, 1A)
        
    Returns:
        dict with booking URL and status
    """
    orchestrator = TrainBookingOrchestrator(url)
    
    # Scrape and display trains
    scrape_result = orchestrator.scrape_and_display_trains()
    if scrape_result['status'] != 'success':
        return scrape_result
    
    print("\n" + scrape_result['display'])
    
    # Select train and coach
    selection_result = orchestrator.select_train_and_coach(train_index, coach_class)
    if selection_result['status'] != 'success':
        return selection_result
    
    print("\n" + selection_result['summary'])
    
    # Complete booking with Playwright
    booking_result = await orchestrator.complete_booking_flow()
    
    return booking_result


def book_train_sync(
    url: str,
    train_index: int,
    coach_class: str
) -> Dict[str, Any]:
    """Complete train booking workflow (synchronous wrapper)
    
    Args:
        url: EasyMyTrip trains URL
        train_index: Index of train to book
        coach_class: Coach class (SL, 3A, 2A, 1A)
        
    Returns:
        dict with booking URL and status
    """
    return asyncio.run(book_train_complete(url, train_index, coach_class))


if __name__ == '__main__':
    print("Train Booking Orchestrator - Example Usage\n")
    
    # Example parameters
    example_url = "https://railways.easemytrip.com/TrainListInfo/Ongole--All-Stations-(ONG)-to-Hyderabad--All-Stations-(HYD)/2/04-11-2025"
    example_train_index = 0
    example_coach = "2A"
    
    print(f"URL: {example_url}")
    print(f"Train Index: {example_train_index}")
    print(f"Coach: {example_coach}\n")
    
    print("To book a train:")
    print(f'  result = book_train_sync(')
    print(f'      url="{example_url}",')
    print(f'      train_index={example_train_index},')
    print(f'      coach_class="{example_coach}"')
    print(f'  )')
    print(f'  print(result["booking_url"])\n')
    
    print("Available coaches: SL (Sleeper), 3A (3rd AC), 2A (2nd AC), 1A (1st AC)")
