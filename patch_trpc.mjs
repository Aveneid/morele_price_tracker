// Patch the tRPC incomingMessageToRequest to add debugging
import Module from 'module';
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  const module = originalRequire.apply(this, arguments);
  
  if (id.includes('incomingMessageToRequest')) {
    console.log('Patching incomingMessageToRequest');
    const original = module.incomingMessageToRequest;
    
    module.incomingMessageToRequest = function(req, res, opts) {
      console.log('incomingMessageToRequest called with:', {
        hasBody: 'body' in req,
        bodyType: typeof req.body,
        bodyValue: req.body,
      });
      
      const result = original.call(this, req, res, opts);
      console.log('incomingMessageToRequest result:', {
        url: result.url,
        method: result.method,
        bodyType: typeof result.body,
      });
      
      return result;
    };
  }
  
  return module;
};

// Now import the server
import('./server/_core/index.ts');
