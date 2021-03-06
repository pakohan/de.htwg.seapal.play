package de.htwg.seapal.database.impl;

import com.google.inject.Inject;
import com.google.inject.name.Named;
import de.htwg.seapal.database.IPersonDatabase;
import de.htwg.seapal.model.IPerson;
import de.htwg.seapal.model.ModelDocument;
import de.htwg.seapal.model.impl.Person;
import de.htwg.seapal.utils.logging.ILogger;
import org.ektorp.CouchDbConnector;
import org.ektorp.CouchDbInstance;
import org.ektorp.DocumentNotFoundException;
import org.ektorp.impl.StdCouchDbConnector;
import org.ektorp.support.CouchDbRepositorySupport;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class PersonDatabase
        extends CouchDbRepositorySupport<Person>
        implements IPersonDatabase {

    private final ILogger logger;
    private final StdCouchDbConnector connector;

    @Inject
    protected PersonDatabase(@Named("personCouchDbConnector") CouchDbConnector db, ILogger logger, CouchDbInstance dbInstance) {
        super(Person.class, db);
        super.initStandardDesignDocument();
        this.logger = logger;
        connector = new StdCouchDbConnector(db.getDatabaseName(), dbInstance);
    }

    @Override
    public boolean open() {
        logger.info("PersonDatabase", "Database connection opened");
        return true;
    }

    @Override
    public UUID create() {
        return null;
    }

    @Override
    public boolean save(IPerson data) {
        Person entity = (Person) data;

        if (entity.isNew()) {
            // ensure that the id is generated and revision is null for saving a new entity
            entity.setId(UUID.randomUUID().toString());
            entity.setRevision(null);
            add(entity);
            return true;
        }

        logger.info("PersonDatabase", "Updating entity with UUID: " + entity.getId());
        update(entity);
        return false;
    }

    @Override
    public IPerson get(UUID id) {
        try {
            return get(id.toString());
        } catch (DocumentNotFoundException e) {
            return null;
        }
    }

    @Override
    public List<IPerson> loadAll() {
        List<IPerson> persons = new LinkedList<IPerson>(getAll());
        logger.info("PersonDatabase", "Loaded entities. Count: " + persons.size());
        return persons;
    }

    @Override
    public void delete(UUID id) {
        logger.info("PersonDatabase", "Removing entity with UUID: " + id.toString());
        remove((Person) get(id));
    }

    @Override
    public boolean close() {
        return true;
    }
    @Override
    public List<? extends IPerson> queryViews(final String viewName, final String key) {
        try {
            return super.queryView(viewName, key);
        } catch (DocumentNotFoundException e) {
            return new ArrayList<>();
        }
    }

    @Override
    public void create(ModelDocument doc) {
        connector.create(doc);
    }

    @Override
    public void update(ModelDocument document) {
        connector.update(document);
    }
}
