import sys
import threading
import trace
from ak_logger import logger

class thread_with_trace(threading.Thread):
    def __init__(self, cleanup=None, *args, **keywords):
        threading.Thread.__init__(self, *args, **keywords)
        self.killed = False
        self.cleanup = cleanup
        
    def start(self):
        self.__run_backup = self.run
        self.run = self.__run     
        threading.Thread.start(self)
 
    def __run(self):
        sys.settrace(self.globaltrace)
        try:
            self.__run_backup()
        finally:
            if self.cleanup:
                self.cleanup()
                                
        self.run = self.__run_backup
 
    def globaltrace(self, frame, event, arg):
        if event == 'call':
            return self.localtrace
        else:
            return None
 
    def localtrace(self, frame, event, arg):
        if self.killed:
            if event == 'line':
                raise SystemExit()
            
        return self.localtrace
 
    def kill(self):
        self.killed = True
