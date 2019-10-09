
import $msg from 'message-tag';

import { Status, statusKey } from './Status.js';
import { Loadable, itemKey } from './Loadable.js';


// A *loader* is a function that takes an item (the current state), and returns a promise for
// a new (loaded) item. To create such a loader, a loader creator may be used to build a loader
// function from a given specification.

export type Loader<T> = (item : Loadable<T>) => Promise<Loadable<T>>;

type LoaderSpec = unknown;
export type LoaderCreator<T> = (...args : Array<LoaderSpec>) => Loader<T>;


// Version of `Error` that keeps a reference to the item
export class LoadError<T> extends Error {
    readonly item : Loadable<T>;
    
    constructor(reason : unknown, item : Loadable<T>) {
        let message = '';
        if (reason instanceof Error) {
            message = reason.message;
        }
        
        super($msg`Loading failed: ${message}`);
        this.item = item;
    }
}

// type Fulfill = (resolve : (result : unknown) => void, reject : (reason : unknown) => void) => void;
type Resolver<T> = (value ?: T | PromiseLike<T>) => void;
type Rejecter = (reason ?: any) => void;
type PromiseExecutor<T> = (resolve : Resolver<T>, reject : Rejecter) => void;

// Extended version of `Promise` that works with loadable items.
// Note: although the ES6 spec allows extending Promise, babel by default does not support
// it. Can use `transform-builtin-extend` to support this.
// https://github.com/babel/babel/issues/1120
// 
// Note: should extending Promise become an issue, we could always fall back to just implementing
// the "thenable" interface (i.e. just a method named `then()`).
export class LoadablePromise<T> extends Promise<Loadable<T>> {
    // Set the species to regular `Promise`, so that `then()` chaining will not try to create
    // a new LoadablePromise (which fails due to lack of information given to the constructor).
    static [Symbol.species] = Promise;
    
    // Create from existing promise
    static from<T>(item : Loadable<T>, promise : Promise<Loadable<T>>) : LoadablePromise<T> {
        return new LoadablePromise((resolve, reject) => {
            promise.then(resolve, reject);
        }, item);
    }
    
    private fulfilled : boolean = false;
    public readonly item : Loadable<T>;
    
    constructor(
        executor : (resolve : (item : Loadable<T>) => void, reject : (item : Loadable<T>) => void) => void,
        item : Loadable<T>
    ) {
        super((resolve : Resolver<Loadable<T>>, reject : Rejecter) => {
            // Note: need to do this check here, because we cannot do it before `super()`, but we also want
            // it before the call to `executor()`.
            if (!item[statusKey].loading) {
                throw new TypeError($msg`Expected item with status loading, given ${item[statusKey]}`);
            }
            
            executor(
                (item : Loadable<T>) => {
                    if (!item[statusKey].ready) {
                        throw new TypeError($msg`Expected item with status ready, given ${item[statusKey]}`);
                    }
                    
                    this.fulfilled = true;
                    resolve(item);
                },
                (item : Loadable<T>) => {
                    if (!item[statusKey].error) {
                        throw new TypeError($msg`Expected item with status failed, given ${item[statusKey]}`);
                    }
                    
                    this.fulfilled = true;
                    reject(new LoadError(item[statusKey].error, item));
                },
            );
        });
        
        this.item = item;
    }
    
    // Similar to `then()`, but will be called:
    // - Once, synchronously, with the item in loading state, *if* the item is not already fulfilled
    //   (resolved or rejected) synchronously.
    // - Second, when the item is fulfilled, with the item in the corresponding state (ready/failed).
    // In addition, `subscribe` does not distinguish between resolved/rejected, it only takes
    // one function which is called regardless of the result (check the `status` instead).
    subscribe(this : LoadablePromise<T>, subscriber : (item : Loadable<T>) => void) : typeof this {
        if (!this.fulfilled) {
            // Note: should be guaranteed to be in loading state (by the check in the constructor)
            subscriber(this.item);
        }
        
        this.then(
            (itemReady : Loadable<T>) => { subscriber(itemReady); },
            (reason : LoadError<T>) => { subscriber(reason.item); },
        );
        
        return this;
    }
}
