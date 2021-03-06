
import chai, { assert, expect } from 'chai';

import * as Loadable from '../../lib-esm/interfaces/Loadable.js';


describe('Loadable', () => {
    describe('symbols', () => {
        it('should expose a unique `item` symbol', () => {
            expect(Loadable.itemKey).to.be.a('symbol');
            
            // Note: `<symbol>.description` is not yet supported in Node v10
            if (Symbol.prototype.hasOwnProperty('description')) {
                expect(Loadable.itemKey).to.have.property('description').to.equal('lifecycle.loadable.item');
            }
        });
        
        it('should expose a unique `status` symbol', () => {
            expect(Loadable.statusKey).to.be.a('symbol');
            
            // Note: `<symbol>.description` is not yet supported in Node v10
            if (Symbol.prototype.hasOwnProperty('description')) {
                expect(Loadable.statusKey).to.have.property('description').to.equal('lifecycle.loadable.status');
            }
        });
        
        it('should expose a unique `construct` symbol', () => {
            expect(Loadable.constructKey).to.be.a('symbol');
            
            // Note: `<symbol>.description` is not yet supported in Node v10
            if (Symbol.prototype.hasOwnProperty('description')) {
                expect(Loadable.constructKey).to.have.property('description').to.equal('lifecycle.loadable.construct');
            }
        });
    });
    
    describe('isStatus', () => {
        it('should return false for primitives', () => {
            [undefined, null, 'foo', 42, NaN, true, false].forEach(prim => {
                expect(Loadable.isStatus(prim)).to.equal(false);
            });
        });
        
        it('should return false for objects that are not a Status', () => {
            [{}, { x: 42 }, [], [1,2,3], x => x + 1].forEach(obj => {
                expect(Loadable.isStatus(obj)).to.equal(false);
            });
        });
        
        it('should return false for Status implementations with improper types', () => {
            const improperStatus = {
                ready: undefined, // Wrong type (should be boolean)
                loading: 42, // Wrong type (should be boolean)
                error: new Date(), // Wrong type (should be null or `Error`)
            };
            
            expect(Loadable.isStatus(improperStatus)).to.equal(false);
        });
        
        it('should return true for objects that implement Status', () => {
            const status1 = {
                ready: true,
                loading: false,
                error: null,
            };
            
            const status2 = {
                ready: false,
                loading: true,
                error: null,
            };
            
            expect(Loadable.isStatus(status1)).to.equal(true);
            expect(Loadable.isStatus(status2)).to.equal(true);
        });
    });
    
    describe('isLoadable', () => {
        it('should return false for primitives', () => {
            [undefined, null, 'foo', 42, NaN, true, false].forEach(prim => {
                expect(Loadable.isLoadable(prim)).to.equal(false);
            });
        });
        
        it('should return false for objects that are not Loadable', () => {
            [{}, { x: 42 }, [], [1,2,3], x => x + 1].forEach(obj => {
                expect(Loadable.isLoadable(obj)).to.equal(false);
            });
        });
        
        it('should return false for Loadable implementations with improper types', () => {
            const improperLoadable = {
                [Loadable.itemKey]: true,
                [Loadable.statusKey]: 42, // Wrong type (should be object)
                [Loadable.constructKey]: 'x', // Wrong type (should be function)
            };
            
            expect(Loadable.isLoadable(improperLoadable)).to.equal(false);
        });
        
        it('should return true for objects that implement Loadable', () => {
            const loadable = {
                [Loadable.itemKey]: true,
                [Loadable.statusKey]: { ready: true, loading: false, error: new Error() },
                [Loadable.constructKey]: () => {},
            };
            
            expect(Loadable.isLoadable(loadable)).to.equal(true);
        });
    });
    
    describe('LoadableRecord', () => {
        const LoadableRecord = Loadable.LoadableRecord;
        
        describe('construction', () => {
            it('should construct a resource with default status if given `undefined`', () => {
                const resource = LoadableRecord();
                expect(resource).to.have.property(Loadable.itemKey).to.equal(undefined);
                expect(resource).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: false,
                    loading: false,
                    error: null,
                });
                
                // Non-symbol property key aliases
                expect(resource).to.have.property('item').to.equal(undefined);
                expect(resource).to.have.property('status').to.deep.equal({
                    ready: false,
                    loading: false,
                    error: null,
                });
            });
            
            it('should accept a partial status', () => {
                const resource = LoadableRecord(null, { ready: true });
                expect(resource).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: true,
                    loading: false,
                    error: null,
                });
            });
            
            it('should construct a resource from non-trivial item and complete status', () => {
                const reason = new Error('foo');
                const resource = LoadableRecord({ name: 'john' }, { ready: true, loading: true, error: reason });
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resource).to.have.property(key).to.deep.equal({ name: 'john' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resource).to.have.property(key).to.deep.equal({
                        ready: true,
                        loading: true,
                        error: reason,
                    });
                });
            });
        });
        
        describe('updating', () => {
            it('should be able to construct a new resource using an existing LoadableRecord instance', () => {
                const resource = LoadableRecord();
                
                const resourceConstructed = Loadable.update(resource,
                    { name: 'alice' },
                    { loading: true },
                );
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resourceConstructed).to.have.property(key).to.deep.equal({ name: 'alice' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resourceConstructed).to.have.property(key).to.deep.equal({
                        ready: false,
                        loading: true,
                        error: null,
                    });
                });
            });
            
            it('should be able to convert an existing resource to loading using `asLoading`', () => {
                const resource = LoadableRecord({ name: 'john' });
                
                const resourceLoading = Loadable.asLoading(resource);
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resourceLoading).to.have.property(key).to.deep.equal({ name: 'john' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resourceLoading).to.have.property(key).to.deep.equal({
                        ready: true,
                        loading: true, // Set to `true`
                        error: null,
                    });
                });
            });
            
            it('should be able to convert an existing resource to ready using `asReady`', () => {
                // Converting `undefined` to ready should throw an error
                expect(() => { Loadable.asReady(LoadableRecord()); }).to.throw(TypeError);
                
                
                const resource = LoadableRecord({ name: 'john' });
                
                // Without new item
                const resourceReady1 = Loadable.asReady(resource);
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resourceReady1).to.have.property(key).to.deep.equal({ name: 'john' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resourceReady1).to.have.property(key).to.deep.equal({
                        ready: true, // Set to `true`
                        loading: false,
                        error: null,
                    });
                });
                
                // With new item
                const resourceReady2 = Loadable.asReady(resource, { name: 'alice' });
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resourceReady2).to.have.property(key).to.deep.equal({ name: 'alice' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resourceReady2).to.have.property(key).to.deep.equal({
                        ready: true, // Set to `true`
                        loading: false,
                        error: null,
                    });
                });
            });
            
            it('should be able to convert an existing resource to failed using `asFailed`', () => {
                const resource = LoadableRecord({ name: 'john' });
                
                const reason = new Error('fail');
                const resourceFailed = Loadable.asFailed(resource, reason);
                
                [Loadable.itemKey, 'item'].forEach(key => {
                    expect(resourceFailed).to.have.property(key).to.deep.equal({ name: 'john' });
                });
                
                [Loadable.statusKey, 'status'].forEach(key => {
                    expect(resourceFailed).to.have.property(key).to.deep.equal({
                        ready: true,
                        loading: false,
                        error: reason,
                    });
                });
            });
        });
    });
    
    describe('LoadableProxy', () => {
        const LoadableProxy = Loadable.LoadableProxy;
        
        describe('construction', () => {
            it('should construct a resource with default status if given `undefined`', () => {
                const resource = LoadableProxy();
                expect(resource).to.have.property(Loadable.itemKey).to.equal(undefined);
                expect(resource).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: false,
                    loading: false,
                    error: null,
                });
            });
            
            it('should construct a LoadableProxy without any properties from null', () => {
                expect(LoadableProxy(null)).to.have.property(Loadable.statusKey);
                expect(LoadableProxy(42)[Loadable.statusKey]).to.have.property('ready', true);
            });
            
            it('should not be constructable from a boolean', () => {
                // Booleans cannot be represented as objects (while still maintaining their semantics)
                expect(() => { LoadableProxy(true); }).to.throw(TypeError);
                expect(() => { LoadableProxy(false); }).to.throw(TypeError);
            });
            
            it('should construct a LoadableProxy from a primitive string', () => {
                expect(LoadableProxy('foo')).to.have.property(Loadable.statusKey);
                
                expect(LoadableProxy('foo').toString()).to.equal('foo');
                expect(String(LoadableProxy('foo'))).to.equal('foo');
            });
            
            it('should construct a LoadableProxy from a primitive number', () => {
                expect(LoadableProxy(42)).to.have.property(Loadable.statusKey);
                
                expect(LoadableProxy(42).valueOf()).to.equal(42);
                expect(Number(LoadableProxy(42))).to.equal(42);
            });
            
            it('should construct a LoadableProxy from a plain object', () => {
                expect(LoadableProxy({ x: 42 })).to.have.property(Loadable.statusKey);
                
                expect(LoadableProxy({ x: 42 })).to.have.property('x', 42);
            });
            
            it('should construct a LoadableProxy from a Date instance', () => {
                expect(LoadableProxy(new Date('2018-01-01T03:24:00'))).to.have.property(Loadable.statusKey);
                
                expect(LoadableProxy(new Date('2018-01-01T03:24:00')).getFullYear()).to.equal(2018);
            });
        });
        
        describe('updating', () => {
            it('should be able to construct a new resource using an existing LoadableProxy instance', () => {
                const resource = LoadableProxy();
                
                const resourceConstructed = Loadable.update(resource,
                    { name: 'alice' },
                    { loading: true },
                );
                
                expect(resourceConstructed).to.deep.equal({ name: 'alice' });
                
                expect(resourceConstructed).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: false,
                    loading: true,
                    error: null,
                });
            });
            
            it('should be able to convert an existing resource to loading using `asLoading`', () => {
                const resource = LoadableProxy({ name: 'john' });
                
                const resourceLoading = Loadable.asLoading(resource);
                
                expect(resourceLoading).to.deep.equal({ name: 'john' });
                
                expect(resourceLoading).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: true,
                    loading: true, // Set to `true`
                    error: null,
                });
            });
            
            it('should be able to convert an existing resource to ready using `asReady`', () => {
                const resource = LoadableProxy({ name: 'john' });
                
                // Without new item
                const resourceReady1 = Loadable.asReady(resource);
                
                expect(resourceReady1).to.deep.equal({ name: 'john' });
                
                expect(resourceReady1).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: true, // Set to `true`
                    loading: false,
                    error: null,
                });
                
                // With new item
                const resourceReady2 = Loadable.asReady(resource, { name: 'alice' });
                
                expect(resourceReady2).to.deep.equal({ name: 'alice' });
                
                expect(resourceReady2).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: true, // Set to `true`
                    loading: false,
                    error: null,
                });
            });
            
            it('should be able to convert an existing resource to failed using `asFailed`', () => {
                const resource = LoadableProxy({ name: 'john' });
                
                const reason = new Error('fail');
                const resourceFailed = Loadable.asFailed(resource, reason);
                
                expect(resourceFailed).to.deep.equal({ name: 'john' });
                
                expect(resourceFailed).to.have.property(Loadable.statusKey).to.deep.equal({
                    ready: true,
                    loading: false,
                    error: reason,
                });
            });
        });
    });
});
