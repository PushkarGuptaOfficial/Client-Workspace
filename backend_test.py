#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class ChatAPITester:
    def __init__(self, base_url="https://team-connect-78.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.agent_token = None
        self.agent_data = None
        self.visitor_id = None
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.agent_token:
            test_headers['Authorization'] = f'Bearer {self.agent_token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if success:
                self.log_test(name, True, response_data=response_data)
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")

            return success, response_data

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_visitor_creation(self):
        """Test visitor creation"""
        visitor_data = {
            "name": f"Test Visitor {datetime.now().strftime('%H%M%S')}",
            "source": "whatsapp"
        }
        
        success, response = self.run_test(
            "Create Visitor",
            "POST",
            "visitors",
            200,
            data=visitor_data
        )
        
        if success and 'id' in response:
            self.visitor_id = response['id']
            print(f"   Created visitor ID: {self.visitor_id}")
        
        return success

    def test_get_visitor(self):
        """Test get visitor by ID"""
        if not self.visitor_id:
            self.log_test("Get Visitor", False, "No visitor ID available")
            return False
            
        success, response = self.run_test(
            "Get Visitor",
            "GET",
            f"visitors/{self.visitor_id}",
            200
        )
        return success

    def test_session_creation(self):
        """Test chat session creation"""
        if not self.visitor_id:
            self.log_test("Create Session", False, "No visitor ID available")
            return False
            
        success, response = self.run_test(
            "Create Chat Session",
            "POST",
            f"sessions?visitor_id={self.visitor_id}&visitor_name=Test Visitor",
            200
        )
        
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Created session ID: {self.session_id}")
        
        return success

    def test_get_session(self):
        """Test get session by ID"""
        if not self.session_id:
            self.log_test("Get Session", False, "No session ID available")
            return False
            
        success, response = self.run_test(
            "Get Session",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        return success

    def test_get_all_sessions(self):
        """Test get all sessions"""
        success, response = self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )
        return success

    def test_agent_registration(self):
        """Test agent registration"""
        agent_data = {
            "email": f"test_agent_{datetime.now().strftime('%H%M%S')}@24gameapi.com",
            "password": "TestPass123!",
            "name": f"Test Agent {datetime.now().strftime('%H%M%S')}",
            "role": "agent"
        }
        
        success, response = self.run_test(
            "Register Agent",
            "POST",
            "agents/register",
            200,
            data=agent_data
        )
        
        if success:
            self.agent_data = {
                "email": agent_data["email"],
                "password": agent_data["password"],
                "name": agent_data["name"]
            }
            print(f"   Registered agent: {agent_data['email']}")
        
        return success

    def test_agent_login(self):
        """Test agent login"""
        if not self.agent_data:
            self.log_test("Agent Login", False, "No agent data available")
            return False
            
        login_data = {
            "email": self.agent_data["email"],
            "password": self.agent_data["password"]
        }
        
        success, response = self.run_test(
            "Agent Login",
            "POST",
            "agents/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.agent_token = response['token']
            print(f"   Login successful, token received")
        
        return success

    def test_get_agents(self):
        """Test get all agents"""
        success, response = self.run_test(
            "Get All Agents",
            "GET",
            "agents",
            200
        )
        return success

    def test_assign_session(self):
        """Test assign session to agent"""
        if not self.session_id or not self.agent_data:
            self.log_test("Assign Session", False, "Missing session ID or agent data")
            return False
            
        # Get agent ID from login response or agents list
        success_agents, agents_response = self.run_test(
            "Get Agents for Assignment",
            "GET",
            "agents",
            200
        )
        
        if not success_agents:
            return False
            
        # Find our agent
        agent_id = None
        for agent in agents_response:
            if agent.get('email') == self.agent_data['email']:
                agent_id = agent['id']
                break
                
        if not agent_id:
            self.log_test("Assign Session", False, "Could not find agent ID")
            return False
            
        assign_data = {"agent_id": agent_id}
        
        success, response = self.run_test(
            "Assign Session to Agent",
            "PUT",
            f"sessions/{self.session_id}/assign",
            200,
            data=assign_data
        )
        return success

    def test_create_message(self):
        """Test create message in session"""
        if not self.session_id:
            self.log_test("Create Message", False, "No session ID available")
            return False
            
        message_data = {
            "content": f"Test message from API test at {datetime.now().isoformat()}",
            "message_type": "text"
        }
        
        success, response = self.run_test(
            "Create Message",
            "POST",
            f"sessions/{self.session_id}/messages?sender_type=visitor&sender_id={self.visitor_id}&sender_name=Test Visitor",
            200,
            data=message_data
        )
        return success

    def test_get_messages(self):
        """Test get messages from session"""
        if not self.session_id:
            self.log_test("Get Messages", False, "No session ID available")
            return False
            
        success, response = self.run_test(
            "Get Session Messages",
            "GET",
            f"sessions/{self.session_id}/messages",
            200
        )
        return success

    def test_mark_messages_read(self):
        """Test mark messages as read"""
        if not self.session_id:
            self.log_test("Mark Messages Read", False, "No session ID available")
            return False
            
        success, response = self.run_test(
            "Mark Messages Read",
            "PUT",
            f"sessions/{self.session_id}/read",
            200
        )
        return success

    def test_close_session(self):
        """Test close session"""
        if not self.session_id:
            self.log_test("Close Session", False, "No session ID available")
            return False
            
        success, response = self.run_test(
            "Close Session",
            "PUT",
            f"sessions/{self.session_id}/close",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("=" * 60)
        print("🚀 Starting Chat API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_visitor_creation,
            self.test_get_visitor,
            self.test_session_creation,
            self.test_get_session,
            self.test_get_all_sessions,
            self.test_agent_registration,
            self.test_agent_login,
            self.test_get_agents,
            self.test_assign_session,
            self.test_create_message,
            self.test_get_messages,
            self.test_mark_messages_read,
            self.test_close_session
        ]

        for test in tests:
            try:
                test()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = ChatAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())